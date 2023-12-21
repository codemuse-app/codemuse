import * as vscode from "vscode";
import * as Sentry from "@sentry/node";

import * as Languages from "../languages";
import { Status } from "../status";
import { union, toSimple } from "graphology-operators";
import { buildGraph } from "./graph/build";
import { buildFlattenedGraph } from "./graph/flatten";
import {
  findCycles,
  printCycles,
  compareGraphs,
  loadGraphFromFile,
  saveGraphToFile,
  findMultiUpdateOrder,
  findMultiUpdateOrderWithDepth,
  groupNodesByDepth,
  updateGraphNodes,
  removeDuplicateEdges,
} from "./graph/utils_graph";
import { Graph, LocalGraphNode, ResultGraphNode } from "./graph/types";
import { VectraManager } from "./embedding/embed";
import { MultiDirectedGraph } from "graphology";
import { batch } from "../../shared/utils";
import { documentNode } from "./doc/build";
import { capture } from "./logging/posthog";
import { graphQuery } from "./query";
export class Index {
  private static instance: Index;
  private languages: Languages.LanguageProvider[] = [];
  private originalGraph?: Graph;
  private flattenedGraph?: Graph;
  private context: vscode.ExtensionContext;
  private vectraManager: VectraManager;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    // Create the Vectra Index Instance to store embeddings
    this.vectraManager = new VectraManager(this.context);
    this.vectraManager.initializeIndex();

    // Load graphs if they exist
    this.originalGraph = loadGraphFromFile(
      "originalGraph.json",
      this.context
    ) as Graph;
    this.flattenedGraph = loadGraphFromFile(
      "flattenedGraph.json",
      this.context
    ) as Graph;
  }

  getNumberOfNodes() {
    return this.originalGraph?.size || 0;
  }

  static initialize(context: vscode.ExtensionContext) {
    if (!context.storageUri) {
      // There is no open workspace
      vscode.window.showErrorMessage(
        "CodeMuse: A workspace must be open to use this extension"
      );

      return;
    }

    Index.instance = new Index(context);

    Index.getInstance().languages = [
      new Languages.Typescript(this.instance.context),
      new Languages.Python(this.instance.context),
    ];
  }

  // Function that queries the Vectra index and returns the top K results as a list of ResultGraphNode objects
  async query(text: string): Promise<ResultGraphNode[]> {
    await graphQuery(this.vectraManager, this.originalGraph!, text);

    const vectraResults = await this.vectraManager.query(text);
    let queryResults: ResultGraphNode[] = [];

    for (const [nodeId, score] of vectraResults) {
      if (this.originalGraph && this.originalGraph.hasNode(nodeId)) {
        const nodeData = this.originalGraph.getNodeAttributes(
          nodeId
        ) as LocalGraphNode;
        const resultNode: ResultGraphNode = {
          score: score,
          ...nodeData,
        };
        queryResults.push(resultNode);
      }
    }
    return queryResults;
  }

  static getInstance() {
    if (!Index.instance) {
      // Index.instance = new Index(this.context);
      throw new Error("Index not initialized");
    }

    return Index.instance;
  }

  // A getter that returns the original graph
  getOriginalGraph() {
    return this.originalGraph;
  }

  async run() {
    const transaction = Sentry.getActiveTransaction();

    const instance = Index.getInstance();

    const runSpan = transaction?.startChild({
      op: "function",
      name: "run",
    });

    const done = Status.getInstance().loading("indexing");

    // Show a notification with progress bar
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "CodeMuse is indexing your workspace",
        cancellable: true,
      },
      async (progress, cancellationToken) => {
        let newOriginalGraph: Graph = new MultiDirectedGraph();

        for (const workspace of vscode.workspace.workspaceFolders!) {
          //TODO: how to handle multiple languages??
          const workspaceSpan = runSpan?.startChild({
            op: "function",
            name: "workspace",
          });

          for (const language of instance.languages) {
            if (cancellationToken.isCancellationRequested) {
              return;
            }

            const languageSpan = workspaceSpan?.startChild({
              op: "function",
              name: "language",
              data: {
                language: language.languageId,
              },
            });

            const languageDetectionSpan = languageSpan?.startChild({
              op: "function",
              name: "language detection",
            });

            const isLanguagePresent = await language.detect();

            languageDetectionSpan?.finish();

            if (isLanguagePresent) {
              progress.report({
                message: `indexing ${language.languageId}`,
              });

              capture("language", {
                language: language.languageId,
              });

              const scipPath = await Sentry.startSpan(
                {
                  parentSpanId: languageSpan?.spanId,
                  name: "scip indexing",
                  op: "function",
                },
                () => {
                  Sentry.getActiveSpan()!.parentSpanId = languageSpan?.spanId;
                  return language.run(workspace.uri.fsPath);
                }
              );

              if (cancellationToken.isCancellationRequested) {
                return;
              }

              if (scipPath) {
                // const originalGraph = await buildGraph(workspace.uri.fsPath, scipPath);

                const buildGraphSpan = languageSpan?.startChild({
                  op: "function",
                  name: "buildGraph",
                });

                const newLanguageGraph = await buildGraph(
                  workspace.uri.fsPath,
                  scipPath,
                  language.languageId
                );

                newOriginalGraph = union(
                  newOriginalGraph,
                  newLanguageGraph
                ) as Graph;

                buildGraphSpan?.finish();
              }
            }
            languageSpan?.finish();
          }

          workspaceSpan?.finish();
        }

        // load documentation from the previous graph
        if (instance.originalGraph) {
          updateGraphNodes(newOriginalGraph, instance.originalGraph);
        }

        progress.report({
          message: `parsing graph`,
        });

        const flattenGraphSpan = runSpan?.startChild({
          op: "function",
          name: "flattenGraph",
        });

        // check the number of cycles in the original graph
        const original_cycles = findCycles(newOriginalGraph);
        console.log("Original cycles:");
        printCycles(original_cycles);

        // remove duplicate edges from newOriginalGraph
        const simpleGraph = toSimple(newOriginalGraph);

        // build the flattened graph
        let newFlattenedGraph = buildFlattenedGraph(simpleGraph);

        // Temporary fix for the cycles issue: while findCycles does not return an empty array, rebuild the flattened graph
        /* while (findCycles(newFlattenedGraph).length > 0) {
          newFlattenedGraph = buildFlattenedGraph(newFlattenedGraph);
        } */

        const { addedNodes, updatedNodes, deletedNodes } = compareGraphs(
          instance.flattenedGraph || new MultiDirectedGraph(),
          newFlattenedGraph
        );

        flattenGraphSpan?.finish();

        const flattened_cycles = findCycles(newFlattenedGraph);
        console.log("Flattened cycles (should be NONE):");
        printCycles(flattened_cycles);

        // throw an error if flattened_cyles is not empty
        if (flattened_cycles.length > 0) {
          throw new Error(
            "Flattened graph has cycles. This should not happen."
          );
        }

        // Update the Vectra index
        await this.vectraManager.refreshIndex();
        const allNodesToUpdate = addedNodes.concat(updatedNodes);

        progress.report({
          message: "getting embeddings",
        });

        const embeddingsSpan = runSpan?.startChild({
          name: "get embeddings",
        });

        if (cancellationToken.isCancellationRequested) {
          return;
        }

        await batch(
          allNodesToUpdate.map((nodeId) => {
            const graph = newFlattenedGraph as Graph;

            return async () => {
              const nodeData = graph.getNodeAttributes(
                nodeId
              ) as LocalGraphNode;

              if (nodeData.content) {
                await this.vectraManager.upsertItem(
                  nodeData.content,
                  nodeId,
                  nodeData.hash,
                  nodeData.file
                );
              }

              progress.report({
                message: "getting embeddings",
                increment: 100 / allNodesToUpdate.length / 2,
              });
            };
          }),
          100,
          async () => {
            await this.vectraManager.beginUpdate();
          },
          async () => {
            await this.vectraManager.endUpdate();
          }
        );

        embeddingsSpan?.finish();

        await this.vectraManager.beginUpdate();

        // Delete embeddings for deleted nodes
        for (const node of deletedNodes) {
          await this.vectraManager.deleteItem(node);
        }

        await this.vectraManager.endUpdate();

        const cleanUpVectors = async () => {
          await this.vectraManager.beginUpdate();

          for (const node of [
            ...updatedNodes,
            ...addedNodes,
            ...deletedNodes,
          ]) {
            await this.vectraManager.deleteItem(node);
          }

          await this.vectraManager.endUpdate();
        };

        if (cancellationToken.isCancellationRequested) {
          await cleanUpVectors();
          return;
        }

        const documentationSpan = runSpan?.startChild({
          op: "function",
          name: "documentation",
        });

        // Builds documentation
        // get the order of the nodes in which they should be documented:
        const nodesOrder = findMultiUpdateOrderWithDepth(
          newFlattenedGraph,
          allNodesToUpdate
        );

        progress.report({
          message: "generating documentation",
        });

        // get the different batch:
        const nodesBatch = groupNodesByDepth(nodesOrder).reverse();

        for (const nodeList of nodesBatch) {
          if (cancellationToken.isCancellationRequested) {
            await cleanUpVectors();
            return;
          }

          // Map each nodeId to a documentNode promise
          await batch(
            nodeList.map((nodeId) => {
              const graph = newOriginalGraph as Graph;

              return async () => {
                await documentNode(graph, nodeId);

                progress.report({
                  message: "generating documentation",
                  increment: 100 / allNodesToUpdate.length / 2,
                });
              };
            }),
            50
          );
        }

        documentationSpan?.finish();

        // At the end of the run method, save the graphs
        if (newOriginalGraph) {
          saveGraphToFile(newOriginalGraph, "originalGraph.json", this.context);
          this.originalGraph = newOriginalGraph;
        }
        if (newFlattenedGraph) {
          saveGraphToFile(
            newFlattenedGraph,
            "flattenedGraph.json",
            this.context
          );
          this.flattenedGraph = newFlattenedGraph;
        }
      }
    );

    runSpan?.finish();

    transaction?.finish();

    done();
  }
}

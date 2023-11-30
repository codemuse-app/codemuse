import * as vscode from "vscode";

import * as Languages from "../languages";
import { Status } from "../status";
import { buildGraph } from "./graph/build";
import { buildFlattenedGraph } from "./graph/flatten"; // Import the function
import { findCycles, printCycles, compareGraphs} from "./graph/utils_graph"; // Import the function
import { Graph, LocalGraphNode, ResultGraphNode } from "./graph/types";
import { VectraManager } from "./embedding/embed"; // Assuming these functions are defined in 'embedding.ts'
import path = require("path");
import * as fs from 'fs';


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
}

  static initialize(context: vscode.ExtensionContext) {
    Index.instance = new Index(context);

    Index.getInstance().languages = [
      // new Languages.Typescript(context),
      new Languages.Python(this.instance.context),
    ];
  }

  // Function that queries the Vectra index and returns the top K results as a list of ResultGraphNode objects
  async query(text: string): Promise<ResultGraphNode[]> {
    const vectraResults = await this.vectraManager.query(text);
    let queryResults: ResultGraphNode[] = [];

    for (const [nodeId, score] of vectraResults) {
      if (this.originalGraph && this.originalGraph.hasNode(nodeId)) {
        const nodeData = this.originalGraph.getNodeAttributes(nodeId) as LocalGraphNode;
        const resultNode: ResultGraphNode = {
          score: score,
          symbol: nodeData.symbol,
          language: nodeData.language,
          file: nodeData.file,
          range: nodeData.range,
          content: nodeData.content
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

  async run() {
    const instance = Index.getInstance();

    // Show a notification with progress bar
    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "CodeMuse is indexing your workspace",
        cancellable: false,
      },
      async (progress) => {
        for (const workspace of vscode.workspace.workspaceFolders!) {
          for (const language of instance.languages) {
            const done = Status.getInstance().loading(
              `indexing ${language.languageId}`
            );

            if (await language.detect()) {
              progress.report({
                message: `Indexing ${language.languageId}`,
              });

              const scipPath = await language.run(workspace.uri.fsPath);

              // const originalGraph = await buildGraph(workspace.uri.fsPath, scipPath);
              instance.originalGraph = await buildGraph(
                workspace.uri.fsPath,
                scipPath,
                language.languageId
              );

              progress.report({
                message: `Indexing ${language.languageId} complete`,
              });

              // check the number of cycles in the original graph
              const original_cycles = findCycles(instance.originalGraph);
              console.log("Original cycles:");
              printCycles(original_cycles);

              // Generate the flattened version of the graph
              // case 1: if the flattenedGraph is not yet generated, generate it
              if (!instance.flattenedGraph) {
                instance.flattenedGraph = buildFlattenedGraph(
                  instance.originalGraph
                );

                this.vectraManager.refreshIndex();
                await this.vectraManager.beginUpdate();

                await Promise.all(
                  instance.flattenedGraph.nodes().map(async (node) => {
                    const nodeData = instance.flattenedGraph!.getNodeAttributes(
                      node
                    ) as LocalGraphNode;
                    if (nodeData.content) {
                      //await vectraManager.addItem(nodeData.content, node, nodeData.hash, nodeData.file);
                      await this.vectraManager.upsertItem(
                        nodeData.content,
                        node,
                        nodeData.hash,
                        nodeData.file
                      );
                    }
                  })
                );

                await this.vectraManager.endUpdate();
              } else {
                // case 2: if the flattenedGraph is already generated, compare it with the new graph, and replace it with the new graph
                const newFlattenedGraph = buildFlattenedGraph(
                  instance.originalGraph
                );
                const { addedNodes, updatedNodes, deletedNodes } =
                  compareGraphs(instance.flattenedGraph, newFlattenedGraph);
                instance.flattenedGraph = newFlattenedGraph; // Replace with the new graph

                // Delete embeddings for deleted nodes
                for (const node of deletedNodes) {
                  await this.vectraManager.deleteItem(node);
                }

                // Update or create embeddings for added or updated nodes using upsertItem
                // Concatenate addedNodes and updatedNodes
                const allNodesToUpdate = addedNodes.concat(updatedNodes);

                // // Iterate over all nodes to update or create embeddings
                // for (const nodeId of allNodesToUpdate) {
                //   const nodeData = newFlattenedGraph.getNodeAttributes(nodeId) as LocalGraphNode;

                //   // Extracting the relevant information from the node
                //   const content = nodeData.content;  // Replace with actual attribute names if different
                //   const id = nodeId            // Metadata ID
                //   const hash = nodeData.hash;        // Unique hash
                //   const filePath = nodeData.file;    // File path

                //   // Upsert the item in the Vectra index
                //   await vectraManager.upsertItem(content, id, hash, filePath);
                // }

                await Promise.all(
                  // Iterate over all nodes to update or create embeddings
                  allNodesToUpdate.map(async (nodeId) => {
                    const nodeData = newFlattenedGraph.getNodeAttributes(
                      nodeId
                    ) as LocalGraphNode;

                    // Extracting the relevant information from the node
                    const content = nodeData.content; // Replace with actual attribute names if different
                    const id = nodeId; // Metadata ID
                    const hash = nodeData.hash; // Unique hash
                    const filePath = nodeData.file; // File path

                    // Upsert the item in the Vectra index
                    await this.vectraManager.upsertItem(
                      content,
                      id,
                      hash,
                      filePath
                    );
                  })
                );

                // Then perform the documentation update:
                // TODO
                
              
              }

              const flattened_cycles = findCycles(instance.flattenedGraph);
              console.log("Flattened cycles (should be NONE):");
              printCycles(flattened_cycles);

              progress.report({
                message: `Generation of the FlattenedGraph complete`,
              });
            } else {
              console.log("Did not detect language");
            }

            done();
          }
        }
      }
    );
  }
}

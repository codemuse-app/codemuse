import { Graph, LocalGraphNode } from "../graph/types";
import {
  compareGraphs,
  findCycles,
  findMultiUpdateOrderWithDepth,
  groupNodesByDepth,
  loadGraphFromFile,
  printCycles,
} from "../graph/utils_graph";
import { join } from "path";
import * as Languages from "../../languages";
import { buildGraph } from "../graph/build";
import { MultiDirectedGraph } from "graphology";
import { toSimple, union } from "graphology-operators";
import { QueryIndex } from "./query";
import { documentNode } from "../doc/build";
import { batch } from "../../../shared/utils";
import { buildFlattenedGraph } from "../graph/flatten";

export class GenericIndex extends QueryIndex {
  flattenedGraph?: Graph;
  languages: Languages.LanguageProvider[] = [];

  constructor(storagePath: string) {
    super(storagePath);

    this.languages = [
      new Languages.Typescript(storagePath),
      new Languages.Python(storagePath),
    ];

    this.flattenedGraph = loadGraphFromFile(
      join(storagePath, "flattenedGraph.json")
    );
  }

  async indexFolder(folderPath: string) {
    let newOriginalGraph: Graph = new MultiDirectedGraph();

    for (const language of this.languages) {
      const isLanguagePresent = await language.detect(folderPath);

      console.log(isLanguagePresent);
      console.log(language.languageId);

      if (isLanguagePresent) {
        const scipPath = await language.run(folderPath);

        console.log(scipPath);
        console.log("scip path");

        if (scipPath) {
          const newLanguageGraph = await buildGraph(
            folderPath,
            scipPath,
            language.languageId
          );

          newOriginalGraph = union(newOriginalGraph, newLanguageGraph) as Graph;
        }
      }
    }

    return newOriginalGraph;
  }

  async process(graph: Graph, token: string) {
    const newOriginalGraph = graph;
    const simpleGraph = toSimple(graph);
    // build the flattened graph
    let newFlattenedGraph = buildFlattenedGraph(simpleGraph);

    const { addedNodes, updatedNodes, deletedNodes } = compareGraphs(
      this.flattenedGraph || new MultiDirectedGraph(),
      newFlattenedGraph
    );

    const flattened_cycles = findCycles(newFlattenedGraph);
    console.log("Flattened cycles (should be NONE):");
    printCycles(flattened_cycles);

    // throw an error if flattened_cyles is not empty
    if (flattened_cycles.length > 0) {
      throw new Error("Flattened graph has cycles. This should not happen.");
    }

    // Update the Vectra index
    await this.vectraManager.refreshIndex();
    const allNodesToUpdate = addedNodes.concat(updatedNodes);

    await batch(
      allNodesToUpdate.map((nodeId) => {
        const graph = newFlattenedGraph as Graph;

        return async () => {
          const nodeData = graph.getNodeAttributes(nodeId) as LocalGraphNode;

          if (nodeData.content) {
            await this.vectraManager.upsertItem(
              nodeData.content,
              nodeId,
              nodeData.hash,
              nodeData.file,
              token
            );
          }
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

    await this.vectraManager.beginUpdate();

    // Delete embeddings for deleted nodes
    for (const node of deletedNodes) {
      await this.vectraManager.deleteItem(node);
    }

    await this.vectraManager.endUpdate();

    // Builds documentation
    // get the order of the nodes in which they should be documented:
    const nodesOrder = findMultiUpdateOrderWithDepth(
      newFlattenedGraph,
      allNodesToUpdate
    );

    // get the different batch:
    const nodesBatch = groupNodesByDepth(nodesOrder).reverse();

    for (const nodeList of nodesBatch) {
      // Map each nodeId to a documentNode promise
      await batch(
        nodeList.map((nodeId) => {
          const graph = newOriginalGraph as Graph;

          return async () => {
            await documentNode(graph, nodeId, token);
          };
        }),
        50
      );
    }

    return newOriginalGraph;
  }
}

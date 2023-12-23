import { VectraManager } from "../embedding/embed";
import { Graph, LocalGraphNode, ResultGraphNode } from "../graph/types";
import { loadGraphFromFile } from "../graph/utils_graph";
import { join } from "path";
import { boost, graphQuery } from "../query";
import { getSymbolName } from "../../../shared/utils";

const MAX_RESULTS = 100;

export class GenericIndex {
  originalGraph?: Graph;
  flattenedGraph?: Graph;
  vectraManager: VectraManager;

  constructor(storagePath: string) {
    this.vectraManager = new VectraManager(storagePath);
    this.vectraManager.initializeIndex();

    // Load graphs if they exist
    this.originalGraph = loadGraphFromFile(
      join(storagePath, "originalGraph.json")
    );

    this.flattenedGraph = loadGraphFromFile(
      join(storagePath, "flattenedGraph.json")
    );
  }

  async query(text: string, token: string): Promise<ResultGraphNode[]> {
    const vectraResults = await graphQuery(
      this.vectraManager,
      this.originalGraph!,
      text,
      token
    );

    // const vectraResults = await this.vectraManager.query(text);
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

    const boosts = await boost(
      queryResults.map((result) => {
        return {
          id: result.symbol,
          document: {
            ...result,
            ...getSymbolName(result.symbol),
          },
          score: 0,
        };
      }),
      text
    );

    queryResults = queryResults.map((result) => {
      return {
        ...result,
        score: result.score + (boosts.get(result.symbol) || 0) * result.score,
      };
    });

    // Resort the results
    queryResults = queryResults.sort((a, b) => {
      return b.score - a.score;
    });

    return queryResults.length > MAX_RESULTS
      ? queryResults.slice(0, MAX_RESULTS)
      : queryResults;
  }
}

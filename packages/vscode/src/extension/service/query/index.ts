import { ParsedSymbolName } from "../../../shared/utils";
import { VectraManager } from "../embedding/embed";
import { Graph, LocalGraphNode } from "../graph/types";
import { Orama, Results, create, insert, search } from "@orama/orama";
// @ts-ignore
import * as stopwords from "@orama/stopwords/english";

const DAMPING = 0.95;
const TOLERANCE = 0.05;

const propagate = (graph: Graph) => {
  const scoreBoost = new Map<string, number>();
  const outDegrees = new Map<string, number>();

  for (const node of graph.nodes()) {
    scoreBoost.set(node, 0);
    outDegrees.set(node, graph.outDegree(node));
  }

  const propagateNode = (node: string, boost: number) => {
    if (boost < TOLERANCE) {
      return;
    }

    const outDegree = outDegrees.get(node) as number;

    scoreBoost.set(node, (scoreBoost.get(node) || 0) + boost);

    boost *= 1 - DAMPING;

    if (outDegree === 0) {
      return;
    }

    const outNeighbors = graph.outNeighbors(node);

    for (const outNeighbor of outNeighbors) {
      propagateNode(outNeighbor, boost / outDegree);
    }
  };

  // For each node that has a score, propagate it to its out neighbors, weighted by the number of out neighbors, recursively until TOLERANCE is reached.
  for (const node of graph.nodes()) {
    if ((graph.getNodeAttribute(node, "score") as number) > 0) {
      propagateNode(node, graph.getNodeAttribute(node, "score") as number);
    }
  }

  for (const node of graph.nodes()) {
    graph.setNodeAttribute(node, "score", scoreBoost.get(node) || 0);
  }
};

export const graphQuery = async (
  vectraManager: VectraManager,
  graph: Graph,
  text: string
): Promise<[string, number][]> => {
  const vectraResults = await vectraManager.query(text, 1000);
  const graphCopy = graph.copy();

  for (const node of graphCopy.nodes()) {
    graphCopy.setNodeAttribute(node, "score", 0);
  }

  for (const result of vectraResults) {
    graphCopy.setNodeAttribute(result[0], "score", result[1]);
  }

  propagate(graphCopy);

  const topNodes = graphCopy
    .nodes()
    .sort((a, b) => {
      const aScore = graphCopy.getNodeAttribute(a, "score") as number;
      const bScore = graphCopy.getNodeAttribute(b, "score") as number;

      return bScore - aScore;
    })
    .map((node) => [node, graphCopy.getNodeAttribute(node, "score") as number]);

  return topNodes as [string, number][];
};

export type BoostDocument = {
  [key in keyof (Omit<ParsedSymbolName, "scipIndexer"> &
    Omit<
      LocalGraphNode,
      | "range"
      | "hash"
      | "fileHash"
      | "content"
      | "processedContent"
      | "score"
      | "graphScore"
    >)]: string;
};

export const boost = async (
  documents: {
    id: string;
    document: BoostDocument;
    score: number;
  }[],
  query: string
): Promise<Map<string, number>> => {
  const db = await create({
    schema: {
      name: "string",
      moduleName: "string",
      type: "string",
      language: "string",
      packageName: "string",
      file: "string",
      symbol: "string",
      documentation: "string",
    } satisfies BoostDocument,
    components: {
      tokenizer: {
        stopWords: [...stopwords.stopwords, "a"],
      },
    },
  });

  for (const document of documents) {
    // @ts-ignore
    await insert(db, document.document);
  }

  const results: Results<BoostDocument> = await search(db, {
    term: query,
    boost: {
      file: 2,
      name: 2,
      type: 2,
    },
    limit: 100,
  });

  const maxScore = results.hits[0].score || 0;

  return new Map(
    results.hits.map(
      (result) =>
        [result.document.symbol, result.score / maxScore] as [string, number]
    )
  );
};

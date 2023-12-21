import { VectraManager } from "../embedding/embed";
import { Graph } from "../graph/types";

export const graphQuery = async (
  vectraManager: VectraManager,
  graph: Graph,
  text: string
) => {
  const vectraResults = await vectraManager.query(text);
  const graphCopy = graph.copy();

  for (const result of vectraResults) {
    graphCopy.setNodeAttribute(result[0], "score", result[1]);
  }

  // weightedPageRank(graphCopy);
  const nodes = vectraResults;

  console.log(nodes);
};

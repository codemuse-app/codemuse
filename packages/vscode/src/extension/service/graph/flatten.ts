import { MultiDirectedGraph } from 'graphology';
import { GraphNode, type Graph } from "./types";
import { readFile, writeFileSync } from "fs";


type NodeColor = 'white' | 'grey' | 'black';

// Function to perform DFS and identify back edges
function dfsRemoveBackEdges(graph: MultiDirectedGraph): [string, string][] {
  let nodesColor: Map<string, NodeColor> = new Map();
  let edgesToBeRemoved: [string, string][] = [];

  graph.nodes().forEach(node => {
    nodesColor.set(node, 'white');  // white: not visited
  });

  const dfsVisitRecursively = (node: string) => {
    nodesColor.set(node, 'grey');  // grey: being visited
    graph.outNeighbors(node).forEach(child => {
      if (nodesColor.get(child) === 'white') {
        dfsVisitRecursively(child);
      } else if (nodesColor.get(child) === 'grey') {
        edgesToBeRemoved.push([node, child]);
      }
    });
    nodesColor.set(node, 'black');  // black: already visited
  };

  graph.nodes().forEach(node => {
    if (nodesColor.get(node) === 'white') {
      dfsVisitRecursively(node);
    }
  });

  return edgesToBeRemoved;
}

// Main function to build the flattened graph
export const buildFlattenedGraph = (originalGraph: MultiDirectedGraph): MultiDirectedGraph => {
  const flattenedGraph = new MultiDirectedGraph();

  // Clone nodes from the original graph
  originalGraph.nodes().forEach(node => {
    flattenedGraph.addNode(node);
  });

  // Clone edges from the original graph, excluding self loops
  originalGraph.forEachEdge((edge, attributes, source, target) => {
    if (source !== target) {
      flattenedGraph.addEdgeWithKey(edge, source, target, attributes);
    }
  });

  // Perform DFS to determine edges to be removed
  const edgesToRemove = dfsRemoveBackEdges(flattenedGraph);

  // Remove the identified back edges
  edgesToRemove.forEach(edge => {
    edgesToRemove.forEach(([source, target]) => {
      if (flattenedGraph.hasEdge(source, target)) {
        flattenedGraph.dropEdge(source, target);
      }})});

  return flattenedGraph;
};
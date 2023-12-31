import { MultiDirectedGraph } from 'graphology';
import { type Graph, GraphNode, GraphEdge, LocalGraphNode } from "./types";
import { readFile, writeFileSync } from "fs";

/* DFS for Back Edge Detection: The dfsRemoveBackEdges function performs DFS on the graph to find back edges 
(edges that contribute to cycles). The order in which nodes are visited is based on the order returned by graph.nodes() 
and graph.outNeighbors(node). If these methods return nodes in a consistent order every time, this part of the code is deterministic.
To ensure determinism, you can sort the nodes before performing DFS. This guarantees that the order of node traversal is consistent 
across different executions. */



type NodeColor = 'white' | 'grey' | 'black';

// Function to perform DFS and identify back edges
function dfsRemoveBackEdges(graph: Graph): [string, string][] {
  let nodesColor: Map<string, NodeColor> = new Map();
  let edgesToBeRemoved: [string, string][] = [];

  graph.nodes().forEach(node => {
    nodesColor.set(node, 'white'); // white: not visited
  });

  const dfsVisitRecursively = (node: string) => {
    nodesColor.set(node, 'grey'); // grey: being visited
    graph.outNeighbors(node).forEach(child => {
      if (nodesColor.get(child) === 'white') {
        dfsVisitRecursively(child);
      } else if (nodesColor.get(child) === 'grey') {
        edgesToBeRemoved.push([node, child]);
      }
    });
    nodesColor.set(node, 'black'); // black: already visited
  };

  const sortedNodes = [...graph.nodes()].sort();
  sortedNodes.forEach(node => {
    if (nodesColor.get(node) === 'white') {
      dfsVisitRecursively(node);
    }
  });

  return edgesToBeRemoved;
}

// Main function to build the flattened graph
export const buildFlattenedGraph = (originalGraph: Graph): Graph => {
  const flattenedGraph: Graph = new MultiDirectedGraph();

  // Clone nodes from the original graph
  originalGraph.nodes().forEach(node => {
    const { hash, file, range, content, symbol, language } = originalGraph.getNodeAttributes(node) as LocalGraphNode;
    flattenedGraph.addNode(node, { hash, file, range, content, symbol, language });
  });

  // Clone edges from the original graph, excluding self loops
  originalGraph.forEachEdge((edge, attributes: GraphEdge, source, target) => {
    if (source !== target) {
      flattenedGraph.addEdgeWithKey(edge, source, target, attributes);
    }
  });

  // Perform DFS to determine edges to be removed
  const edgesToRemove = dfsRemoveBackEdges(flattenedGraph);

  // Remove the identified back edges
  edgesToRemove.forEach(([source, target]) => {
    if (flattenedGraph.hasEdge(source, target)) {
      flattenedGraph.dropEdge(source, target);
    }
  });

  return flattenedGraph;
};

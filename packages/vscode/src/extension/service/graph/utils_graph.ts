import { MultiDirectedGraph } from "graphology";
import { createHash } from "crypto";
import { type Graph, GraphNode, LocalGraphNode } from "./types";
import * as vscode from "vscode";
import path = require("path");
import * as fs from "fs";

export function printCycles(cycles: string[][]): void {
  if (cycles.length === 0) {
    console.log("NO CYCLE");
  } else {
    cycles.forEach((cycle, index) => {
      console.log(`Cycle ${index + 1}: ${cycle.join(" -> ")}`);
    });
  }
}

/**
 * Removes duplicate edges from a multi-directed graph.
 * @param {Graph} graph - The graph from which to remove duplicate edges.
 * @returns {MultiDirectedGraph} A new graph with duplicate edges removed.
 */
export function removeDuplicateEdges(graph: Graph): Graph {
  let newGraph: Graph = new MultiDirectedGraph();

  // Copy all nodes to the new graph
  graph.nodes().forEach((node) => {
    newGraph.addNode(node);
  });

  // Iterate over all nodes in the graph
  graph.nodes().forEach((node) => {
    let uniqueNeighbors = new Set();

    // Iterate over all outgoing neighbors of the node
    graph.outNeighbors(node).forEach((neighbor) => {
      if (!uniqueNeighbors.has(neighbor)) {
        uniqueNeighbors.add(neighbor);
        // Copy the edge to the new graph, assuming it's directed
        newGraph.addEdge(node, neighbor);
      }
    });
  });

  return newGraph;
}

/* The findCycles function takes a graph and returns a list of cycles in the graph. */
export function findCycles(graph: Graph): string[][] {
  let visited: Set<string> = new Set();
  let path: string[] = [];
  let cycles: string[][] = [];

  const dfsVisit = (node: string, parent: string | null) => {
    if (path.includes(node)) {
      const cycle = path.slice(path.indexOf(node));
      cycles.push(cycle);
      return;
    }

    if (!visited.has(node)) {
      visited.add(node);
      path.push(node);

      graph.outNeighbors(node).forEach((neighbor) => {
        if (!visited.has(neighbor) || neighbor === parent) {
          dfsVisit(neighbor, node);
        } else if (path.includes(neighbor)) {
          const cycle = path.slice(path.indexOf(neighbor));
          cycles.push(cycle);
        }
      });

      path.pop();
    }
  };

  graph.nodes().forEach((node) => {
    if (!visited.has(node)) {
      dfsVisit(node, null);
    }
  });

  return cycles;
}

/* perform a reverse topological sort starting from the updated node, moving upwards to all
   its ancestors (parent nodes) up to the root nodes. The reverse topological sort ensures that
   a node is only processed after all its descendants (in this case, the nodes that depend on it)
   have been processed. */

export function findUpdateOrder(graph: Graph, updatedNode: string): string[] {
  let order: string[] = [];
  let visited: Set<string> = new Set();

  const visit = (node: string) => {
    if (!visited.has(node)) {
      visited.add(node);
      graph.inNeighbors(node).forEach(visit);
      order.push(node);
    }
  };

  visit(updatedNode);
  return order.reverse();
}

/* The findMultiUpdateOrder function takes a list of updated nodes and returns a list of nodes
    in the order in which they should be updated. The function first performs a DFS on the graph
    starting from each updated node to identify all nodes that are affected by the update. It then
    performs a reverse topological sort on the affected nodes to determine the order in which they
    should be updated. */

export function findMultiUpdateOrder(
  graph: Graph,
  updatedNodes: string[]
): string[] {
  let depths: Map<string, number> = new Map();
  let allNodes: Set<string> = new Set();

  const visit = (node: string, depth: number) => {
    if (!allNodes.has(node) || depths.get(node)! < depth) {
      allNodes.add(node);
      depths.set(node, depth);
      graph.inNeighbors(node).forEach((parent) => visit(parent, depth + 1));
    }
  };

  updatedNodes.forEach((node) => visit(node, 0));

  return Array.from(allNodes)
    .sort((a, b) => depths.get(b)! - depths.get(a)!)
    .filter((node, index, self) => self.indexOf(node) === index);
}

/* The findMultiUpdateOrderWithDepth function takes a list of updated nodes and returns a list of nodes with their depth
 */
export function findMultiUpdateOrderWithDepth(
  graph: Graph,
  updatedNodes: string[]
): [string, number][] {
  // Updated return type to include depth
  let depths: Map<string, number> = new Map();
  let allNodes: Set<string> = new Set();

  const visit = (node: string, depth: number) => {
    if (!allNodes.has(node) || depths.get(node)! < depth) {
      allNodes.add(node);
      depths.set(node, depth);
      graph.inNeighbors(node).forEach((parent) => visit(parent, depth + 1));
    }
  };

  updatedNodes.forEach((node) => visit(node, 0));

  // Modified to return an array of tuples [node, depth]
  return Array.from(allNodes)
    .sort((a, b) => depths.get(b)! - depths.get(a)!)
    .filter((node, index, self) => self.indexOf(node) === index)
    .map((node) => [node, depths.get(node)!]); // Map each node to a tuple [node, depth]
}

/* Function that detect if GraphNode is LocalGraphNode or ExternalGraphNode --> TODO: remove this function and use type check in TS instead */
function isLocalGraphNode(node: GraphNode): node is LocalGraphNode {
  return (node as LocalGraphNode).hash !== undefined;
}

/* Funtion that group nodes by depth in order to have different executin batch that can be run in parallel */
export function groupNodesByDepth(
  nodesWithDepth: [string, number][]
): string[][] {
  // Create a Map to group nodes by their depth
  const depthGroups: Map<number, string[]> = new Map();

  // Iterate over each node and group them by depth
  nodesWithDepth.forEach(([nodeId, depth]) => {
    if (!depthGroups.has(depth)) {
      depthGroups.set(depth, []);
    }
    depthGroups.get(depth)!.push(nodeId);
  });

  // Convert the Map to a sorted array of arrays
  // Sort the depths in decreasing order and map each depth to its group of nodes
  return Array.from(depthGroups.entries())
    .sort((a, b) => b[0] - a[0]) // Sort by depth in decreasing order
    .map((entry) => entry[1]); // Extract only the list of nodes
}

/* Function that compare two graphs and return the added, updated and deleted nodes between the two graphs. */
export function compareGraphs(
  oldGraph: Graph,
  newGraph: Graph
): {
  addedNodes: string[];
  updatedNodes: string[];
  deletedNodes: string[];
} {
  let addedNodes: string[] = [];
  let updatedNodes: string[] = [];
  let deletedNodes: string[] = [];
  let oldGraphNodes: Set<string> = new Set(oldGraph.nodes());

  newGraph.forEachNode((node, attributes) => {
    if (!oldGraph.hasNode(node)) {
      addedNodes.push(node);
    } else {
      const oldAttributes = oldGraph.getNodeAttributes(node) as LocalGraphNode;
      if (oldAttributes.hash !== (attributes as LocalGraphNode).hash) {
        updatedNodes.push(node);
      }
    }
    oldGraphNodes.delete(node);
  });

  deletedNodes = Array.from(oldGraphNodes);

  return { addedNodes, updatedNodes, deletedNodes };
}

export function saveGraphToFile(graph: Graph, filePath: string) {
  const graphData = graph.export();
  fs.writeFileSync(filePath, JSON.stringify(graphData));
}

export function loadGraphFromFile(filePath: string): Graph | undefined {
  // const filePath = path.join(context.storageUri!.fsPath, filename);
  if (fs.existsSync(filePath)) {
    const graphData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const graph = new MultiDirectedGraph();
    graph.import(graphData);
    return graph as Graph;
  }
  return undefined;
}

export const hashContent = (content: string): string => {
  return createHash("sha256").update(content).digest("hex");
};

export const hashNode = (node: Omit<LocalGraphNode, "hash">): string => {
  return hashContent(node.content);
};

// copy documentatin and processedContent of a all nodes
export function updateGraphNodes(
  newOriginalGraph: Graph,
  originalGraph: Graph
): void {
  // Iterate over all nodes in newOriginalGraph
  newOriginalGraph.forEachNode((nodeKey, attributes) => {
    // Assuming 'hash' is the unique identifier
    const nodeHash = attributes.hash;

    // Check if this.originalGraph has a node with the same hash
    let originalNodeKey = originalGraph.findNode((node) => {
      return originalGraph.getNodeAttribute(node, "hash") === nodeHash;
    });

    if (originalNodeKey !== undefined) {
      // Copy attributes from this.originalGraph to newOriginalGraph
      const processedContent = originalGraph.getNodeAttribute(
        originalNodeKey,
        "processedContent"
      );
      const documentation = originalGraph.getNodeAttribute(
        originalNodeKey,
        "documentation"
      );

      // Update newOriginalGraph node attributes
      newOriginalGraph.mergeNodeAttributes(nodeKey, {
        processedContent,
        documentation,
      });
    }
  });
}

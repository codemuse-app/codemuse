import { MultiDirectedGraph } from "graphology";
import { createHash } from "crypto";
import { type Graph, GraphNode, LocalGraphNode } from "./types";

export function printCycles(cycles: string[][]): void {
  if (cycles.length === 0) {
    console.log("NO CYCLE");
  } else {
    cycles.forEach((cycle, index) => {
      console.log(`Cycle ${index + 1}: ${cycle.join(" -> ")}`);
    });
  }
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

/* Function that detect if GraphNode is LocalGraphNode or ExternalGraphNode --> TODO: remove this function and use type check in TS instead */
function isLocalGraphNode(node: GraphNode): node is LocalGraphNode {
  return (node as LocalGraphNode).hash !== undefined;
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

export const hashNode = (node: Omit<LocalGraphNode, "hash">): string => {
  return createHash("sha256").update(node.content).digest("hex");
};

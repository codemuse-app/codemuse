import { MultiDirectedGraph } from 'graphology';
import { GraphNode, type Graph } from "./types";

export function printCycles(cycles: string[][]): void {
    if (cycles.length === 0) {
        console.log("NO CYCLE");
      } else {
        cycles.forEach((cycle, index) => {
          console.log(`Cycle ${index + 1}: ${cycle.join(" -> ")}`);
        });
      }
  }

export function findCycles(graph: MultiDirectedGraph): string[][] {
  let visited: Set<string> = new Set();
  let path: string[] = [];
  let cycles: string[][] = [];

  const dfsVisit = (node: string, parent: string | null) => {
    if (path.includes(node)) {
      // Cycle found, extract the cycle
      const cycle = path.slice(path.indexOf(node));
      cycles.push(cycle);
      return;
    }

    if (!visited.has(node)) {
      visited.add(node);
      path.push(node);

      // Visit all neighbors including the parent
      graph.outNeighbors(node).forEach(neighbor => {
        if (!visited.has(neighbor) || neighbor === parent) {
          dfsVisit(neighbor, node);
        } else if (path.includes(neighbor)) {
          // Check if the neighbor is already in the path (cycle detected)
          const cycle = path.slice(path.indexOf(neighbor));
          cycles.push(cycle);
        }
      });

      // Backtrack
      path.pop();
    }
  };

  graph.nodes().forEach(node => {
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

export function findUpdateOrder(graph: MultiDirectedGraph, updatedNode: string): string[] {
  // TODO: to be tested
  let order: string[] = [];
  let visited: Set<string> = new Set();
  
  const visit = (node: string) => {
    if (!visited.has(node)) {
      visited.add(node);
      graph.inNeighbors(node).forEach(visit); // Visit parent nodes
      order.push(node); // Add the node after visiting parents (reverse topological sort)
    }
  };
  
  visit(updatedNode); // Start from the updated node
  return order.reverse(); // Reverse to get the correct update order
}

/* The findMultiUpdateOrder function takes a list of updated nodes and returns a list of nodes
    in the order in which they should be updated. The function first performs a DFS on the graph 
    starting from each updated node to identify all nodes that are affected by the update. It then 
    performs a reverse topological sort on the affected nodes to determine the order in which they 
    should be updated. */

export function findMultiUpdateOrder(graph: MultiDirectedGraph, updatedNodes: string[]): string[] {
  // TODO: to be tested
  let depths: Map<string, number> = new Map();
  let allNodes: Set<string> = new Set();

  const visit = (node: string, depth: number) => {
    if (!allNodes.has(node) || depths.get(node)! < depth) {
      allNodes.add(node);
      depths.set(node, depth);
      graph.inNeighbors(node).forEach(parent => visit(parent, depth + 1));
    }
  };

  updatedNodes.forEach(node => visit(node, 0));

  return Array.from(allNodes)
    .sort((a, b) => depths.get(b)! - depths.get(a)!) // Sort by depth in descending order
    .filter((node, index, self) => self.indexOf(node) === index); // Remove duplicates
}
  
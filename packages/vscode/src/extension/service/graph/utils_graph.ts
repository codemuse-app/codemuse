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

   function findUpdateOrder(graph: MultiDirectedGraph, updatedNode: string): string[] {
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
  
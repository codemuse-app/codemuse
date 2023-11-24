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

// // Function to find all cycles in the graph
// export function findCycles(graph: MultiDirectedGraph): string[][] {
//     let visited: Set<string> = new Set();
//     let path: string[] = [];
//     let cycles: string[][] = [];
  
//     const dfsVisit = (node: string, parent: string | null) => {
//       if (path.includes(node)) {
//         // Cycle found, extract the cycle
//         const cycle = path.slice(path.indexOf(node));
//         cycles.push(cycle);
//         return;
//       }
  
//       if (!visited.has(node)) {
//         visited.add(node);
//         path.push(node);
  
//         // Visit all neighbors
//         graph.outNeighbors(node).forEach(neighbor => {
//           if (neighbor !== parent) { // Avoid immediate backtracking
//             dfsVisit(neighbor, node);
//           }
//         });
  
//         // Backtrack
//         path.pop();
//       }
//     };
  
//     graph.nodes().forEach(node => {
//       if (!visited.has(node)) {
//         dfsVisit(node, null);
//       }
//     });
  
//     return cycles;
//   }

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

// Function to find the order in which the nodes should be updated given an updated node
  function getUpdateOrder(graph: MultiDirectedGraph, startNode: string): string[] {
    let visited: Set<string> = new Set();
    let stack: string[] = [];
  
    // Function to perform DFS and collect nodes in post-order (topological sort)
    const dfs = (node: string) => {
      visited.add(node);
      graph.inNeighbors(node).forEach(parent => {
        if (!visited.has(parent)) {
          dfs(parent);
        }
      });
      stack.push(node);
    };
  
    // Starting DFS from the updated node
    dfs(startNode);
  
    // The stack now contains the nodes in the order they should be updated
    return stack.reverse();
  }
  
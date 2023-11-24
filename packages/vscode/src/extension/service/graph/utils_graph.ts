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

// Function to find all cycles in the graph
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
  
        // Visit all neighbors
        graph.outNeighbors(node).forEach(neighbor => {
          if (neighbor !== parent) { // Avoid immediate backtracking
            dfsVisit(neighbor, node);
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
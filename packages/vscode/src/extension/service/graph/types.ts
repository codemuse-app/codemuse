import { type MultiDirectedGraph } from "graphology";

export type Range = [number, number, number, number];

export interface BasicGraphNode {
  symbol: string;
}
export interface ExternalGraphNode extends BasicGraphNode {}
export interface LocalGraphNode extends BasicGraphNode {
  file: string;
  range: Range;
  content: string;
}

export type GraphNode = ExternalGraphNode | LocalGraphNode;

export interface GraphEdge {
  type: "uses" | "defines";
  at: Range;
}

export type Graph = MultiDirectedGraph<GraphNode, GraphEdge>;

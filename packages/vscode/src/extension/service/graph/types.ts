import { type MultiDirectedGraph } from "graphology";

export type Range = [number, number, number, number];

export type SupportedLanguage = "python";

export interface BasicGraphNode {
  symbol: string;
  language: SupportedLanguage;
}
export interface ExternalGraphNode extends BasicGraphNode {}
export interface LocalGraphNode extends BasicGraphNode {
  file: string;
  range: Range;
  content: string;
  hash: string; // Hash of the content + outbouds links
}

export type GraphNode = ExternalGraphNode | LocalGraphNode;

export interface GraphEdge {
  type: "uses" | "defines";
  at: Range;
}

export type Graph = MultiDirectedGraph<GraphNode, GraphEdge>;

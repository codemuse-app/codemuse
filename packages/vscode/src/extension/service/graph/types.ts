import { type MultiDirectedGraph } from "graphology";

export type Range = [number, number, number, number];

export type SupportedLanguage = "python" | "typescript";

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
  fileHash?: string;
  processedContent?: string;
  documentation?: string;
  // Search parameter
  score?: number;
  graphScore?: number;
}

export interface ResultGraphNode extends Omit<LocalGraphNode, "hash"> {
  score: number;
}

export type GraphNode = LocalGraphNode | LocalGraphNode;

export interface GraphEdge {
  type: "uses" | "defines";
  at: Range;
  weight?: number;
}

export type Graph = MultiDirectedGraph<GraphNode, GraphEdge>;

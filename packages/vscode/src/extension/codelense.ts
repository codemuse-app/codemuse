import * as vscode from "vscode";
import { Index } from "./service";
import { LocalGraphNode } from "./service/graph/types";

// Create a new VSCode CodeLens provider
export class CodeMuseCodeLens implements vscode.CodeLensProvider {

    // Provide the CodeLens data
    async provideCodeLenses(
      document: vscode.TextDocument,
      token: vscode.CancellationToken
    ): Promise<vscode.CodeLens[]> {


        // Get the Index instance
        const index = Index.getInstance();
        const graph = index.getOriginalGraph();

        // For each node in the graph, pull the information and store it in a list of records based on the Graph type
        let records = [];
        for (const node of graph!.nodes()) {
            const nodeData = graph!.getNodeAttributes(node);
            if (nodeData) {
                records.push(nodeData as LocalGraphNode);
            }
        }

        // Each record has a field called called file: string and range: [number, number, number, number];
        // For each of these records, we need to create a new CodeLens object
        const codeLenses = records.map((record) => {
            const range = new vscode.Range(
                new vscode.Position(record.range[0], record.range[1]),
                new vscode.Position(record.range[2], record.range[3])
            );

            const lenses = [];

            const codeLens = new vscode.CodeLens(range, {
                title: "🧠 CodeMuse",
                command: "extension.askCodeMuse",
                arguments: [record, range],
                tooltip: "Ask CodeMuse to explain " + record.symbol,
            });

            lenses.push(codeLens);

            if (record.content && record.symbol) {
                const codeLens2 = new vscode.CodeLens(range, {
                    title: "Documentation",
                    command: "extension.askCodeMuseDoc",
                    arguments: [record, range],
                    tooltip: "Ask an explanation for " + record.symbol,
                });

                lenses.push(codeLens2);
            }

            return lenses;
        });

      // Flatten the array of arrays
      return codeLenses.flat();
    }
  }
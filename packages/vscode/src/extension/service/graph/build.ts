import { readFile, writeFileSync } from "fs";
import { promisify } from "util";
import { MultiDirectedGraph } from "graphology";
import { join } from "path";

import { GraphNode, type Graph } from "./types";
import { scip } from "../scip";

export const buildGraph = async (cwd: string, scipIndexPath: string) => {
  // Load the SCIP index into a buffer
  const buffer = await promisify(readFile)(scipIndexPath);

  const index = scip.Index.deserialize(buffer);

  const graph: Graph = new MultiDirectedGraph();

  for (const document of index.documents) {
    // Read the file contents
    const fileLines = (
      await promisify(readFile)(join(cwd, document.relative_path))
    )
      .toString()
      .split("\n");

    const extractContents = (range: number[]) => {
      range = formatRange(range);

      const contents = [];

      for (let i = range[0]; i <= range[2]; i++) {
        const line = fileLines[i];

        if (i === range[0]) {
          contents.push(line.slice(range[1]));
        } else if (i === range[2]) {
          contents.push(line.slice(0, range[3]));
        } else {
          contents.push(line);
        }
      }

      return contents;
    };

    const documentSymbol = document.occurrences[0].symbol;

    const documentRanges: {
      range: number[];
      symbol: string;
      content: string;
    }[] = [];

    // Add the document symbol
    documentRanges.push({
      range: [
        0,
        0,
        fileLines.length - 1,
        fileLines[fileLines.length - 1].length,
      ],
      symbol: documentSymbol,
      content: fileLines.join("\n"),
    });

    for (const occurrence of document.occurrences) {
      if (occurrence.enclosing_range.length > 0) {
        documentRanges.push({
          range: formatRange(occurrence.enclosing_range),
          symbol: occurrence.symbol,
          content: extractContents(occurrence.enclosing_range).join("\n"),
        });

        graph.mergeNode(occurrence.symbol, {
          range: formatRange(occurrence.range),
        });
      }
    }

    // Sort the ranges by start position, and then by end position (finishing last)
    documentRanges.sort((a, b) => sortRanges(a.range, b.range));

    // Reverse the ranges
    documentRanges.reverse();

    // Function that returns the narrowest range that contains the given range
    const getParentSymbol = (enclosingRange: number[], selfSymbol: string) => {
      enclosingRange = formatRange(enclosingRange);

      for (const range of documentRanges) {
        if (range.symbol === selfSymbol) {
          continue;
        }

        const rangeStartsBefore =
          range.range[0] < enclosingRange[0] ||
          (range.range[0] === enclosingRange[0] &&
            range.range[1] <= enclosingRange[1]);
        const rangeEndsAfter =
          range.range[2] > enclosingRange[2] ||
          (range.range[2] === enclosingRange[2] &&
            range.range[3] >= enclosingRange[3]);

        if (rangeStartsBefore && rangeEndsAfter) {
          return range.symbol;
        }
      }

      return documentSymbol;
    };

    for (const range of documentRanges) {
      graph.mergeNode(range.symbol, {
        symbol: range.symbol,
        range: formatRange(range.range),
        content: range.content,
        file: document.relative_path,
      } satisfies GraphNode);

      const parentSymbol = getParentSymbol(range.range, range.symbol);

      if (parentSymbol === range.symbol) {
        continue;
      }

      graph.mergeNode(parentSymbol);
      graph.addDirectedEdge(parentSymbol, range.symbol, {
        type: "defines",
        at: formatRange(range.range),
      });
    }

    for (const occurrence of document.occurrences) {
      const isLocal = occurrence.symbol.startsWith("local");

      if (isLocal) {
        continue;
      }

      if (occurrence.symbol.endsWith(".")) {
        continue;
      }

      if (occurrence.symbol_roles === scip.SymbolRole.Definition) {
        continue;
      }

      const parentSymbol = getParentSymbol(occurrence.range, occurrence.symbol);

      graph.mergeNode(parentSymbol);
      graph.mergeNode(occurrence.symbol, {
        symbol: occurrence.symbol,
      } satisfies GraphNode);
      graph.addDirectedEdge(parentSymbol, occurrence.symbol, {
        type: "uses",
        at: formatRange(occurrence.range),
      });
    }
  }

  return graph;
};

const formatRange = (range: number[]): [number, number, number, number] => {
  if (range.length === 4) {
    return range as [number, number, number, number];
  } else if (range.length === 3) {
    return [range[0], range[1], range[0], range[2]];
  } else {
    return [range[0], range[1], range[0], range[1]];
  }
};

// Sort the ranges by start position, and then by end position (finishing last). Ranges are in the form [col, char, end_col, end_char]
const sortRanges = (a: number[], b: number[]) => {
  a = formatRange(a);
  b = formatRange(b);

  if (a[0] === b[0]) {
    if (a[1] === b[1]) {
      if (a[2] === b[2]) {
        return a[3] - b[3];
      }

      return a[2] - b[2];
    }

    return a[1] - b[1];
  }

  return a[0] - b[0];
};

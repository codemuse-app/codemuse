import { readFile } from "fs";
import { promisify } from "util";
import { MultiDirectedGraph } from "graphology";
import { join } from "path";

import { scip } from "../scip";

export const buildGraph = async (cwd: string, scipIndexPath: string) => {
  // Load the SCIP index into a buffer
  const buffer = await promisify(readFile)(scipIndexPath);

  const index = scip.Index.deserialize(buffer);

  const graph = new MultiDirectedGraph();

  const addDefinition = (occurrence: scip.Occurrence) => {
    graph.mergeNode(occurrence.symbol, {
      range: occurrence.range,
    });
  };

  //TODO: parallelize
  for (const document of index.documents) {
    // Read the file contents
    const fileContents = (
      await promisify(readFile)(join(cwd, document.relative_path))
    ).toString();

    if (document.relative_path.includes("__init__.py")) {
      continue;
    }

    const documentRanges = [];

    for (const occurrence of document.occurrences) {
      if (occurrence.enclosing_range.length > 0) {
        documentRanges.push({
          range: occurrence.enclosing_range,
          symbol: occurrence.symbol,
        });
      }
    }

    console.log(documentRanges);

    break;
  }
};

import { RouterType } from "../../extension/router";
import { createClient } from "../../vrpc/client";
import * as React from "react";
import { VSCodeTextField } from "@vscode/webview-ui-toolkit/react";

const vscode = acquireVsCodeApi();
const client = createClient<RouterType>(vscode);

export const Search = () => {
  const [search, setSearch] = React.useState("");
  const [results, setResults] = React.useState<
    Exclude<Awaited<ReturnType<typeof client.query>>, void>
  >([]);

  React.useEffect(() => {
    (async (search, setResults) => {
      console.log("Called search", search);

      if (search === "") {
        setResults([]);
        return;
      }

      const results = await client.query(search);

      if (results) {
        setResults(results);
      }
    })(search, setResults);
  }, [search, setResults]);

  return (
    <div>
      <div style={{ position: "relative" }}>
        <VSCodeTextField
          style={{
            width: "100%",
          }}
          name="Search"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setSearch(e.target.value);
          }}
        >
          Search
        </VSCodeTextField>
      </div>
      <div>
        {results.map((result) => {
          return (
            <div style={{ paddingBottom: "5px" }}>
              {result.symbol}
              <br />
              <small>{result.file}</small>
            </div>
          );
        })}
      </div>
    </div>
  );
};

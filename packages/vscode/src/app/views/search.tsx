import { RouterType } from "../../extension/router";
import { createClient } from "../../shared/vrpc/client";
import * as React from "react";
import { VSCodeTextField } from "@vscode/webview-ui-toolkit/react";

import "./search.scss";

const vscode = acquireVsCodeApi();
const client = createClient<RouterType>(vscode);

const getSymbolName = (symbol: string) => {
  const [scipIndexer, language, packageName, _version, identifier] =
    symbol.split(" ");

  console.log(symbol);
  console.log(symbol.split(" "));

  const moduleName = identifier.split("/")[0].replace("`", "");
  const describer = identifier.split("/")[1].slice(0, -1);

  let type = "module";

  if (describer.indexOf("#") >= 0) {
    type = "class";

    if (describer.indexOf("(") >= 0) {
      type = "method";
    }
  } else if (describer.indexOf("(") >= 0) {
    type = "function";
  }

  return {
    moduleName,
    language,
    type,
    name: describer,
  };
};

const getResultColors = (score: number) => {
  if (score > 0.4) {
    return {
      backgroundColor: "#047857",
      color: "#d1fae5",
    };
  } else if (score > 0.2) {
    return {
      backgroundColor: "#d97706",
      color: "#fef3c7",
    };
  }

  return {
    backgroundColor: "#b91c1c",
    color: "#fee2e2",
  };
};

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
    <div className="search">
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
      <div
        style={{
          paddingTop: "10px",
        }}
      >
        {results.map((result) => {
          const { name, moduleName, type } = getSymbolName(result.symbol);
          const { backgroundColor, color } = getResultColors(result.score);

          return (
            <div
              className="result"
              style={{
                paddingBottom: "5px",
                paddingTop: "5px",
                borderBottom: "1px solid var(--vscode-activityBar-border)",
              }}
              onClick={() => {
                client.goTo(result.file, result.range);
              }}
            >
              <div style={{ paddingBottom: "5px" }}>
                <small style={{ fontSize: "0.8em", opacity: 0.7 }}>
                  {type.toLocaleUpperCase()}
                  <span
                    style={{
                      float: "right",
                      backgroundColor,
                      color,
                      display: "inline-block",
                      padding: "0px 2px",
                      fontWeight: "bold",
                    }}
                  >
                    {result.score.toFixed(2)}
                  </span>
                </small>
              </div>
              <div
                style={{
                  width: "100%",
                  paddingRight: "10px",
                  paddingBottom: "5px",
                }}
              >
                {name}
              </div>
              <small
                style={{
                  opacity: 0.5,
                }}
              >
                {moduleName}
              </small>
            </div>
          );
        })}
      </div>
    </div>
  );
};

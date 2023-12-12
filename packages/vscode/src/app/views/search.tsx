import * as React from "react";
import {
  VSCodeTextField,
  VSCodeButton,
} from "@vscode/webview-ui-toolkit/react";

import { RouterType } from "../../extension/router";
import { createClient } from "../../shared/vrpc/client";
import { ProgressBar } from "../components/progressBar";
import { getSymbolName } from "../../shared/utils";

import "./search.scss";

const vscode = acquireVsCodeApi();
const client = createClient<RouterType>(vscode);

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
  const [loading, setLoading] = React.useState(false);
  const [results, setResults] = React.useState<
    Exclude<Awaited<ReturnType<typeof client.query>>, void>
  >([]);

  const [isInitialized, setIsInitialized] = React.useState(false);

  const updateNumberOfNodes = React.useCallback(() => {
    (async () => {
      const numberOfNodes = await client.getNumberOfNodes();

      if (numberOfNodes) {
        setIsInitialized(true);
      } else {
        setIsInitialized(false);
      }
    })();
  }, [setIsInitialized, client]);

  React.useEffect(() => {
    updateNumberOfNodes();
  }, []);

  // Refresh initialization status every 1 second
  React.useEffect(() => {
    const interval = setInterval(() => {
      updateNumberOfNodes();
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    (async (search, setResults) => {
      if (search === "") {
        setResults([]);
        return;
      }

      setLoading(true);

      const results = await client.query(search);

      if (results) {
        setResults(results);
        setLoading(false);
      }
    })(search, setResults);
  }, [search, setResults]);

  return (
    <div className="search">
      {isInitialized && (
        <div style={{ paddingBottom: "15px" }}>
          Actions
          <div style={{ paddingTop: "3px" }}>
            <VSCodeButton
              onClick={() => {
                client.index();
              }}
            >
              Reindex
            </VSCodeButton>
          </div>
        </div>
      )}
      <div style={{ position: "relative" }}>
        <VSCodeTextField
          style={{
            width: "100%",
          }}
          name="Search"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setSearch(e.target.value);
          }}
          disabled={!isInitialized}
        >
          Search
        </VSCodeTextField>
        <ProgressBar
          loading={loading}
          style={{
            marginTop: "-2px",
          }}
        />
      </div>
      <div
        style={{
          paddingTop: "10px",
        }}
      >
        {
          // If there are no results, show a message
          results.length === 0 && isInitialized && search === "" && (
            <div
              style={{
                opacity: 0.5,
              }}
            >
              Find elements in your codebase by typing in the search bar above.
              <br />
              <br />
              Examples
              <ul>
                <li>Check the user permission level</li>
                <li>Database model for a user</li>
                <li>Application configuration</li>
              </ul>
            </div>
          )
        }
        {!isInitialized && results.length === 0 && (
          <div>
            <h3>CodeMuse is not initialized</h3>
            <p>
              CodeMuse needs to index your codebase before you can search it. It
              will automatically index any new codespace you open.{" "}
              <a href="https://codemuse.notion.site/Indexing-dec4f5aa0881452a91856b381bf458f3">
                Learn more about indexing.
              </a>
            </p>
            <VSCodeButton
              onClick={() => {
                client.index();
              }}
            >
              Index now
            </VSCodeButton>
          </div>
        )}
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
      <div>
        <p
          style={{
            fontSize: "0.85em",
            borderTop: "1px solid var(--vscode-activityBar-border)",
            paddingTop: "10px",
            paddingBottom: "10px",
            marginTop: "20px",
          }}
        >
          <a href="https://codemuse.notion.site/Troubleshooting-98d042ec94c3468bb012735de6fe0a88">
            Troubleshooting
          </a>
          , <a href="https://discord.com/invite/uRJE6e2rgr">feedback</a>,{" "}
          <a href="https://codemuse.notion.site/a09cd839084048b0bf49dcd98540d01b?v=3cbf6b9c75fe431aa54927ca0ee7b584">
            documentation
          </a>
          , <a href="https://www.codemuse.app/">website</a>.
        </p>
      </div>
    </div>
  );
};

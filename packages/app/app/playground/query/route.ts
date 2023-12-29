import { NextResponse } from "next/server";
import { QueryIndex } from "../../../../vscode/src/extension/service/index/query";
import { getRepositories } from "../utils";
import { ResultGraphNode } from "../../../../vscode/src/extension/service/graph/types";
import { getSymbolName } from "../../../../vscode/src/shared/utils";

export async function GET(request: Request) {
  const repositories = await getRepositories();

  const searchParams = new URL(request.url).searchParams;

  const repository = searchParams.get("repository");

  if (!repository) {
    return NextResponse.json(
      {
        error: true,
        message: "repository param is required",
      },
      {
        status: 400,
      }
    );
  }

  console.log({ repository });
  console.log(repositories);

  const foundRepository = repositories.find((repo) => repo.repo === repository);

  if (!foundRepository) {
    return NextResponse.json(
      {
        error: true,
        message: "repository not found",
      },
      {
        status: 404,
      }
    );
  }

  const query = searchParams.get("query");

  if (!query) {
    return NextResponse.json(
      {
        error: true,
        message: "query param is required",
      },
      {
        status: 400,
      }
    );
  }

  const index = new QueryIndex(foundRepository.repositoryPath);

  const results = await index.query(
    query,
    process.env.PLAYGROUND_TOKEN as string
  );

  const buildUrl = (
    result: ResultGraphNode,
    repo: Awaited<ReturnType<typeof getRepositories>>[number]
  ) => {
    let url = repo.url;
    url += `/blob/${repo.commit}${result.file}`;

    if (result.range) {
      url += `#L${result.range[0] + 1}-L${result.range[2] + 1}`;
    }

    return url;
  };

  return NextResponse.json(
    {
      done: true,
      results: results
        .filter((result) => result.fileHash)
        .map((result) => ({
          ...result,
          parsedName: getSymbolName(result.symbol),
          content: undefined,
          processedContent: undefined,
          url: buildUrl(result, foundRepository),
        })),
    },
    {
      headers: {
        // CORS allow from codemuse.app and localhost
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}

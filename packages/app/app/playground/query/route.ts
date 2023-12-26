import { NextResponse } from "next/server";
import { QueryIndex } from "../../../../vscode/src/extension/service/index/query";
import { getRepositories } from "../utils";

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

  const foundRepository = repositories.find(
    (repo) => repo.repo.split("/").pop() === repository
  );

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

  return NextResponse.json({
    done: true,
    results: results.map((result) => ({
      ...result,
      content: undefined,
      processedContent: undefined,
    })),
  });
}

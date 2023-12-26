import { NextResponse } from "next/server";
import { getRepositories } from "../utils";

export const GET = async () => {
  const repositories = await getRepositories();

  return NextResponse.json(repositories);
};

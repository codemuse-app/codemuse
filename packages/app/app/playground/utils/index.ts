import { readFile, readdir } from "fs/promises";
import { join } from "path";

export const getRepositories = async () => {
  const indexPath = join(process.cwd(), "./app/playground/indexed");

  const folders = await readdir(indexPath);
  const repositoriesFolders = folders.filter(
    (folder) => folder.indexOf("-") >= 0
  );
  const repositoriesPaths = repositoriesFolders.map((repository) =>
    join(indexPath, repository)
  );

  const repositories: {
    commit: string;
    repo: string;
    url: string;
    repositoryPath: string;
  }[] = await Promise.all(
    repositoriesPaths.map(async (repositoryPath) => {
      // Read the meta.json file in the repository folder.
      const meta = JSON.parse(
        await readFile(join(repositoryPath, "meta.json"), "utf-8")
      );

      return {
        ...meta,
        repo: meta.repo.split("github.com/")[1],
        url: meta.repo,
        repositoryPath,
      };
    })
  );

  return repositories;
};

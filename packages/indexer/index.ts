import { join } from "path";
import { GenericIndex } from "../vscode/src/extension/service/index/generic";
import { simpleGit } from "simple-git";
import { saveGraphToFile } from "../vscode/src/extension/service/graph/utils_graph";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmdirSync,
  writeFileSync,
} from "fs";
import * as dotenv from "dotenv";

dotenv.config();

const reposList = [
  /*"https://github.com/Stevenic/vectra",
  "https://github.com/Pythagora-io/gpt-pilot",
  "https://github.com/cumulo-autumn/StreamDiffusion",
  "https://github.com/mckaywrigley/chatbot-ui",
  "https://github.com/heyman/heynote",
  "https://github.com/shadcn-ui/ui",*/
  "https://github.com/langchain-ai/langchain",
];

const tempDir = join(__dirname, "temp");
const indexDir = join(__dirname, "index");

const worker = async () => {
  for (const repo of reposList) {
    console.log("Indexing repo: " + repo);

    // Clean both directories
    if (existsSync(tempDir)) {
      rmdirSync(tempDir, { recursive: true });
    }
    if (existsSync(indexDir)) {
      rmdirSync(indexDir, { recursive: true });
    }

    const git = simpleGit();
    await git.clone(repo, tempDir);

    console.log("Cloned repo: " + repo);

    const index = new GenericIndex(indexDir);
    const graph = await index.indexFolder(tempDir);

    console.log("Indexed repo: " + repo);

    const populatedGraph = await index.process(
      graph,
      process.env.PLAYGROUND_TOKEN
    );

    // Get the head commit hash inside the temp directory
    await git.cwd(tempDir);
    const commit = await git.revparse(["HEAD"]);

    const destinationDirectory =
      "indexed/" + repo.split("/").pop() + "-" + commit;

    // Create directory if it doesn't exist
    if (!existsSync(join(__dirname, destinationDirectory))) {
      mkdirSync(join(__dirname, destinationDirectory));
    }

    // Copy the index.json file to the destination directory
    const indexFile = join(indexDir, "index.json");
    const destinationIndexFile = join(
      __dirname,
      destinationDirectory,
      "index.json"
    );

    // Copy the file
    cpSync(indexFile, destinationIndexFile);

    // Write the graph to a file
    saveGraphToFile(
      populatedGraph,
      join(__dirname, destinationDirectory, "originalGraph.json")
    );

    // Replace the temp dirname with nothing in the originalGraph.json file
    const originalGraphFile = join(
      __dirname,
      destinationDirectory,
      "originalGraph.json"
    );

    // Read the file
    const graphFileContents = readFileSync(originalGraphFile, "utf8");

    // Replace all instances of the temp directory with nothing
    const newGraphFileContents = graphFileContents.replaceAll(tempDir, "");

    // Write the file
    writeFileSync(originalGraphFile, newGraphFileContents);

    // Write a file called meta.json that contains the repo url and the commit hash
    const metaFile = join(__dirname, destinationDirectory, "meta.json");
    const metaFileContents = JSON.stringify({
      repo,
      commit,
    });
    writeFileSync(metaFile, metaFileContents);
  }
};

const postProcess = () => {
  // List all the folders in ./indexed
  const indexedDir = join(__dirname, "indexed");
  const indexedFolders = readdirSync(indexedDir);

  for (const folder of indexedFolders) {
    // Check that it is a folder
    if (folder.indexOf("-") < 0) {
      continue;
    }

    const path = join(indexedDir, folder);

    const commit = folder.split("-").pop();
    const repo = reposList.find((repo) =>
      folder.split("/").pop().startsWith(repo.split("/").pop())
    );

    console.log(commit, repo);

    // Replace the temp dirname with nothing in the originalGraph.json file
    const originalGraphFile = join(path, "originalGraph.json");

    // Read the file
    const graphFileContents = readFileSync(originalGraphFile, "utf8");

    // Replace all instances of the temp directory with nothing
    const newGraphFileContents = graphFileContents.replaceAll(tempDir, "");

    // Write the file
    writeFileSync(originalGraphFile, newGraphFileContents);

    const metaFile = join(path, "meta.json");
    const metaFileContents = JSON.stringify({
      repo,
      commit,
    });
    writeFileSync(metaFile, metaFileContents);
  }
};

worker();
//postProcess();

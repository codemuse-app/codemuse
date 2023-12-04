import { LocalIndex } from "vectra/src/LocalIndex";
import * as vscode from "vscode";

const TOPK = 10; // Top K results to return

export class VectraManager {
  private index: LocalIndex;
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    //this.index = new LocalIndex(path.join(__dirname, '..', 'index'));
    this.index = new LocalIndex(context!.storageUri!.fsPath);
    this.context = context;
  }

  async initializeIndex() {
    if (!(await this.index.isIndexCreated())) {
      await this.index.createIndex();
    }

    await this.refreshIndex();
  }

  async refreshIndex() {
    await this.index.listItemsByMetadata({});
  }

  async getVector(text: string): Promise<number[]> {
    const maxRetries = 2;
    let retries = 0;
    let error: Error | undefined;

    while (retries < maxRetries) {
      try {
        const response = await fetch(
          "https://codemuse-app--api-asgi.modal.run/embedding",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              machineId: vscode.env.machineId,
              code: text,
            }), // Ensure this matches the expected format
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = (await response.json()) as { embedding: number[] };

        return data.embedding;
      } catch (error) {
        retries++;
        error = error;
        if (retries === maxRetries) {
          throw error;
        }
      }
    }

    throw error;
  }

  // Add an item with the given node ID
  async addItem(text: string, id: string, hash: string, path: string) {
    await this.index.insertItem({
      vector: await this.getVector(text),
      metadata: { id, hash, path },
    });
  }

  // Delete items with the given node ID
  async deleteItem(id: string) {
    try {
      // Filter items by metadata to find the item with the matching ID
      const itemsToDelete = await this.index.listItemsByMetadata({ id });
      for (const item of itemsToDelete) {
        await this.index.deleteItem(item.id); // Delete the item
      }
    } catch (error) {
      console.error(`Error deleting item with ID ${id}:`, error);
      throw error;
    }
  }

  async beginUpdate() {
    await this.index.beginUpdate();
  }

  async endUpdate() {
    await this.index.endUpdate();
  }

  // Update or insert an item with the given node ID
  async upsertItem(text: string, id: string, hash: string, filePath: string) {
    let recompute = true;

    const existingItems = await this.index.listItemsByMetadata({ id });

    if (existingItems.length && existingItems[0].metadata.hash === hash) {
      recompute = false;
    }

    if (!recompute) {
      return;
    }

    const vector = await this.getVector(text);
    const metadata = { id, hash, path: filePath };

    const existingItem = existingItems[0];

    await this.index.upsertItem({
      id: existingItem ? existingItem.id : undefined,
      vector,
      metadata: {
        ...(existingItem ? existingItem.metadata : {}),
        ...metadata,
      },
    });
  }

  // Query the index for the given text and return the top K results as a list of tuples [node_id, score]
  async query(text: string): Promise<[string, number][]> {
    const vector = await this.getVector(text);
    const results = await this.index.queryItems(vector, TOPK);

    if (results.length === 0) {
      console.log(`No results found.`);
      return [];
    }

    // Build a list of tuples [node_id, score]
    const tuples: [string, number][] = results.map((result) => {
      return [result.item.metadata.id as string, result.score];
    }); // warning: this assumes that the metadata ID is a string

    // Sort the tuples in descending order by score
    tuples.sort((a, b) => b[1] - a[1]);

    return tuples;
  }
}

import path = require("path");
import fetch from "node-fetch";
import { LocalIndex } from "vectra/src/LocalIndex";
import * as vscode from "vscode";

const TOPK = 10; // Top K results to return

export class VectraManager {
  private index: LocalIndex;

  constructor(context: vscode.ExtensionContext) {
    //this.index = new LocalIndex(path.join(__dirname, '..', 'index'));
    this.index = new LocalIndex(context!.storageUri!.fsPath);
  }

  async initializeIndex() {
    if (!(await this.index.isIndexCreated())) {
      await this.index.createIndex();
    }
  }

  async getVector(text: string): Promise<number[]> {
    try {
      const response = await fetch(
        "https://codemuse-app--generate-embedding.modal.run",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code: text }), // Ensure this matches the expected format
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      return data as number[]; // Assuming the response JSON contains the embedding directly
    } catch (error) {
      console.error("Error fetching embedding:", error);
      throw error;
    }
  }

  async addItem(text: string, id: string, hash: string, path: string) {
    await this.index.insertItem({
      vector: await this.getVector(text),
      metadata: { id, hash, path },
    });
  }

  // Delete items with the given node ID
  async deleteItem(id: string) {
    await this.index.beginUpdate();
    try {
      // Filter items by metadata to find the item with the matching ID
      const itemsToDelete = await this.index.listItemsByMetadata({ id });
      for (const item of itemsToDelete) {
        await this.index.deleteItem(item.id); // Delete the item
      }
      await this.index.endUpdate();
    } catch (error) {
      console.error(`Error deleting item with ID ${id}:`, error);
      this.index.cancelUpdate();
      throw error;
    }
  }

  // Update or insert an item with the given node ID
  async upsertItem(text: string, id: string, hash: string, filePath: string) {
    const vector = await this.getVector(text);
    const metadata = { id, hash, path: filePath };

    await this.index.beginUpdate();
    try {
      // Find existing items by metadata id
      const items = await this.index.listItemsByMetadata({ id });
      const existingItem = items.length > 0 ? items[0] : null; // Assume there is only one item with the given ID (at most)

      if (existingItem) {
        // Update existing item
        existingItem.vector = vector;
        existingItem.metadata = metadata;
        await this.index.upsertItem(existingItem);
      } else {
        // Add new item with a unique internal ID (Vectra's item ID)
        await this.index.insertItem({
          vector,
          metadata,
        });
      }
      await this.index.endUpdate();
    } catch (error) {
      console.error(`Error in upserting item with metadata ID ${id}:`, error);
      this.index.cancelUpdate();
      throw error;
    }
  }

  async query(text: string) {
    const vector = await this.getVector(text);
    const results = await this.index.queryItems(vector, TOPK);
    if (results.length > 0) {
      for (const result of results) {
        console.log(
          `[${result.score}] ID: ${result.item.metadata.id}, Hash: ${result.item.metadata.hash}, Path: ${result.item.metadata.path}`
        );
      }
    } else {
      console.log(`No results found.`);
    }
  }
}

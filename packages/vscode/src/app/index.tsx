// Import react and react-dom and render a view in the 'root-search' element
import * as React from "react";
import { createRoot } from "react-dom/client";

try {
  const root = document.getElementById("root-search");
  if (root) {
    createRoot(root).render(<div>Search</div>);
  }
} catch (e) {}

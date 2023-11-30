import * as React from "react";
import { createRoot } from "react-dom/client";

import { Search } from "./views/search";

try {
  const root = document.getElementById("root-search");
  if (root) {
    createRoot(root).render(<Search />);
  }
} catch (e) {}

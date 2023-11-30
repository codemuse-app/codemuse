import { router as vrpcRouter, procedure } from "../../vrpc";
import { Index } from "../service";

export const router = vrpcRouter({
  helloWorld: procedure((name: string) => `Hello ${name}!`),
  query: procedure((text: string) => Index.getInstance().query(text)),
});

export type RouterType = typeof router;

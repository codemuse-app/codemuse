import { router as vrpcRouter, procedure } from "../../shared/vrpc";
import { goTo } from "../commands";
import { Index } from "../service";

export const router = vrpcRouter({
  helloWorld: procedure((name: string) => `Hello ${name}!`),
  query: procedure((text: string) => Index.getInstance().query(text)),
  goTo: procedure(goTo),
});

export type RouterType = typeof router;

import { router as vrpcRouter, procedure } from "../../vrpc";

export const router = vrpcRouter({
  helloWorld: procedure((name: string) => `Hello ${name}!`),
});

export type RouterType = typeof router;

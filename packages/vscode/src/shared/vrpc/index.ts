type JsonPrimitive = string | number | boolean | null | undefined;
type JsonObject = {
  [key: string | number]: JsonSerializable;
};
type JsonArray = JsonSerializable[];
export type JsonSerializable = JsonPrimitive | JsonArray | JsonObject;

export const procedure = <
  A extends JsonSerializable[] = any[],
  R extends any = any
>(
  fn: (...args: A) => R | Promise<R> | void | Promise<void>
) => fn;

export type Procedure<
  A extends JsonSerializable[] = any[],
  R extends JsonSerializable = any
> = (...args: A) => R | Promise<R>;

export const emitter = <T extends JsonSerializable = JsonSerializable>() => ({
  emit: (message: T) => {},
  subscribe: (message: T) => {},
});

export type Emitter<T extends JsonSerializable = JsonSerializable> = {
  emit: (message: T) => void;
  subscribe: (message: T) => void;
};

export type RouterPart = Procedure | Emitter;
export type Router = { [key: string]: RouterPart | Router };

// Helper function to create a router
export function router<R extends Router>(router: R): R {
  return router;
}

export type Message = {
  type: "vrpc";
  clientId?: string;
  registryId?: string;
  key: string;
  params?: any[];
  value?: any;
};

type JsonSerializable =
  | string
  | number
  | boolean
  | null
  | JsonSerializable[]
  | { [key: string]: JsonSerializable };

export const procedure = <
  A extends JsonSerializable[] = any[],
  R extends JsonSerializable = JsonSerializable
>(
  fn: (...args: A) => R | Promise<R> | void | Promise<void>
) => fn;

export type Procedure<
  A extends JsonSerializable[] = any[],
  R extends JsonSerializable = JsonSerializable
> = (...args: A) => R | Promise<R> | void | Promise<void>;

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

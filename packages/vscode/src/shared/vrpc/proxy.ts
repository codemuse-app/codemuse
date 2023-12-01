// Create a deep object proxy that only captures the "get" operation, and that just outputs a list of keys that were accessed
export const keyProxy = (
  callback: (keys: (string | Symbol)[]) => any,
  keys: (string | Symbol)[] = []
): any => {
  return new Proxy(() => {}, {
    // When the value is called, return the callback
    apply: (_, thisArg, argArray) => {
      return callback(keys).apply(thisArg, argArray);
    },
    get: (_, prop) => {
      return keyProxy(callback, [...keys, prop]);
    },
  });
};

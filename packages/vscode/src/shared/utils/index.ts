/**
 * Batch async operations. Similar to Promise.all, but with a maximum batch size. Returns a promise that resolves to an array of the results of the promises passed as an argument.
 *
 * On error, the batch will be aborted and the error will be thrown. Subsequent batches will not be executed.
 *
 * @param promises The promises to batch
 * @param batchSize The maximum batch size
 * @param beforeBatch A function to call before each batch
 * @param afterBatch A function to call after each batch
 */
export const batch = async (
  promises: Promise<any>[],
  batchSize: number = 100,
  beforeBatch?: () => any,
  afterBatch?: () => any
) => {
  const results: any[] = [];

  for (let i = 0; i < promises.length; i += batchSize) {
    if (beforeBatch) {
      await beforeBatch();
    }

    const batch = promises.slice(i, i + batchSize);

    try {
      const batchResults = await Promise.all(batch);
      results.push(...batchResults);
    } catch (e) {
      throw e;
    } finally {
      if (afterBatch) {
        await afterBatch();
      }
    }
  }

  return results;
};

export const getSymbolName = (symbol: string) => {
  const [scipIndexer, language, packageName, _version, identifier] =
    symbol.split(" ");

  const moduleName = identifier.split("/")[0].replace("`", "");
  const describer = identifier.split("/")[1].slice(0, -1);

  let type = "module";

  if (describer.indexOf("#") >= 0) {
    type = "class";

    if (describer.indexOf("(") >= 0) {
      type = "method";
    }
  } else if (describer.indexOf("(") >= 0) {
    type = "function";
  }
  
  return {
    moduleName,
    language,
    type,
    name: describer,
    scipIndexer,
    packageName,
  };
};

export namespace example {
  class Server {
    // This overloaded method reproduces the following issue https://github.com/sourcegraph/scip-typescript/issues/45
    addListener(name: 'a'): void
    addListener(name: 'b'): void
  }
}

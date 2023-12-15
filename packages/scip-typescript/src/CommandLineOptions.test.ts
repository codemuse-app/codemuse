import { test } from 'uvu'
import * as assert from 'uvu/assert'

import { mainCommand, MultiProjectOptions } from './CommandLineOptions'

function checkIndexParser(
  args: string[],
  expectedOptions: Partial<MultiProjectOptions>,
  expectedProjects?: string[]
): void {
  test(args.join(' '), () => {
    let isAssertionTriggered = false
    const actualArguments = ['node', 'scip-typescript.js', 'index', ...args]
    mainCommand((projects, options) => {
      assert.equal(options, { ...options, ...expectedOptions })
      if (expectedProjects) {
        assert.equal(projects, expectedProjects)
      }
      isAssertionTriggered = true
    }).parse(actualArguments)
    assert.ok(isAssertionTriggered)
  })
}

// defaults
checkIndexParser([], {
  cwd: process.cwd(),
  inferTsconfig: false,
  output: 'index.scip',
  yarnWorkspaces: false,
})

checkIndexParser(['--cwd', 'qux'], { cwd: 'qux' })
checkIndexParser(['--yarn-workspaces'], { yarnWorkspaces: true })
checkIndexParser(['--pnpm-workspaces'], { pnpmWorkspaces: true })
checkIndexParser(['--infer-tsconfig'], { inferTsconfig: true })
checkIndexParser(['--no-progress-bar'], { progressBar: false })
checkIndexParser(['--progress-bar'], { progressBar: true })
checkIndexParser(['--no-global-caches'], { globalCaches: false })

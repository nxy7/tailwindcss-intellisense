import extractClassNames from './extractClassNames.mjs'
import Hook from './hook.mjs'
import dlv from 'dlv'
import dset from 'dset'
import importFrom from 'import-from'
import nodeGlob from 'glob'
import * as path from 'path'
import chokidar from 'chokidar'
import semver from 'semver'
import invariant from 'tiny-invariant'
import getPlugins from './getPlugins'
import getVariants from './getVariants'
import resolveConfig from './resolveConfig'

function glob(pattern, options = {}) {
  return new Promise((resolve, reject) => {
    let g = new nodeGlob.Glob(pattern, options)
    let matches = []
    let max = dlv(options, 'max', Infinity)
    g.on('match', match => {
      matches.push(path.resolve(options.cwd || process.cwd(), match))
      if (matches.length === max) {
        g.abort()
        resolve(matches)
      }
    })
    g.on('end', () => {
      resolve(matches)
    })
    g.on('error', reject)
  })
}

function arraysEqual(arr1, arr2) {
  return JSON.stringify(arr1.sort()) === JSON.stringify(arr2.sort())
}

export default async function getClassNames(
  cwd = process.cwd(),
  { onChange = () => {} } = {}
) {
  let configPath
  let postcss
  let tailwindcss
  let version

  try {
    configPath = await glob(
      '**/{tailwind,tailwind.config,tailwind-config,.tailwindrc}.js',
      {
        cwd,
        ignore: '**/node_modules/**',
        max: 1
      }
    )
    invariant(configPath.length === 1, 'No Tailwind CSS config found.')
    configPath = configPath[0]
    postcss = importFrom(cwd, 'postcss')
    tailwindcss = importFrom(cwd, 'tailwindcss')
    version = importFrom(cwd, 'tailwindcss/package.json').version
  } catch (_) {
    return null
  }

  async function run() {
    const sepLocation = semver.gte(version, '0.99.0')
      ? ['separator']
      : ['options', 'separator']
    let userSeperator
    let hook = Hook(configPath, exports => {
      userSeperator = dlv(exports, sepLocation)
      dset(exports, sepLocation, '__TAILWIND_SEPARATOR__')
      return exports
    })

    hook.watch()
    const config = __non_webpack_require__(configPath)
    hook.unwatch()

    const ast = await postcss([tailwindcss(configPath)]).process(
      `
        @tailwind components;
        @tailwind utilities;
      `,
      { from: undefined }
    )

    hook.unhook()

    if (typeof userSeperator !== 'undefined') {
      dset(config, sepLocation, userSeperator)
    } else {
      delete config[sepLocation]
    }

    return {
      config: resolveConfig({ cwd, config }),
      separator: typeof userSeperator === 'undefined' ? ':' : userSeperator,
      classNames: await extractClassNames(ast),
      dependencies: [configPath, ...hook.deps],
      plugins: getPlugins(config),
      variants: getVariants({ config, version, postcss })
    }
  }

  let watcher
  function watch(files) {
    if (watcher) watcher.close()
    watcher = chokidar
      .watch(files)
      .on('change', handleChange)
      .on('unlink', handleChange)
  }

  let result = await run()
  watch(result.dependencies)

  async function handleChange() {
    const prevDeps = result.dependencies
    result = await run()
    if (!arraysEqual(prevDeps, result.dependencies)) {
      watch(result.dependencies)
    }
    onChange(result)
  }

  return result
}
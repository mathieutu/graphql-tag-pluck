import { parse as babelParse } from '@babel/parser'
import babelTraverse from '@babel/traverse'
import { resolve, extname } from 'path'
import fs from './libs/fs'
import createVisitor from './visitor'

const gqlExtensions = [
  '.graphqls', '.graphql', '.gqls', '.gql'
]

const jsExtensions = [
  '.js', '.jsx', '.ts', '.tsx', '.flow'
]

const supportedExtensions = [...gqlExtensions, ...jsExtensions]

supportedExtensions.toString = function toString() {
  return this.split().join(', ')
}

export const gqlPluckFromFile = (filePath, options = {}) => {
  if (typeof filePath != 'string' && !(filePath instanceof String)) {
    throw TypeError('Provided file path must be a string')
  }

  const fileExt = extname(filePath)

  if (!supportedExtensions.includes(fileExt)) {
    throw TypeError(`Provided file type must be one of ${supportedExtensions}`)
  }

  if (gqlExtensions.includes(fileExt)) {
    return fs.readFile(filePath, { encoding: 'utf8' })
  }

  if (!(options instanceof Object)) {
    throw TypeError(`Options arg must be an object`)
  }

  filePath = resolve(process.cwd(), filePath)
  options = { ...options, fileExt }
  const config = new Config(options)

  if (options.useSync) {
    const code = fs.readFileSync(filePath, { encoding: 'utf8' })

    return gqlPluckFromCodeString(code, config)
  }

  return fs.readFile(filePath, { encoding: 'utf8' }).then((code) => {
    return gqlPluckFromCodeString(code, config)
  })
}

gqlPluckFromFile.sync = (filePath, options = {}) => {
  options = { ...options, useSync: true }

  return gqlPluckFromFile(filePath, options)
}

export const gqlPluckFromCodeString = (codeString, options = {}) => {
  if (typeof codeString != 'string' && !(codeString instanceof String)) {
    throw TypeError('Provided code must be a string')
  }

  if (!(options instanceof Object)) {
    throw TypeError(`Options arg must be an object`)
  }

  if (options.fileExt) {
    if (gqlExtensions.includes(options.fileExt)) {
      return codeString
    }

    if (!jsExtensions.includes(options.fileExt)) {
      throw TypeError(`options.fileExt must be one of ${supportedExtensions}`)
    }
  }

  const config = new Config(options)
  const ast = babelParse(codeString, config)
  const out = {}
  const visitor = createVisitor(codeString, out)

  babelTraverse(ast, visitor)

  return out.returnValue
}

function Config(options) {
  if (options instanceof Config) {
    return options
  }

  const plugins = ['jsx']

  if (options.fileExt == '.flow') {
    plugins.push('flow', 'flowComments')
  }
  else {
    plugins.push('typescript')
  }

  Object.assign(this, {
    sourceType: 'module',
    plugins,
  })
}

export default {
  fromFile: gqlPluckFromFile,
  fromCodeString: gqlPluckFromCodeString,
}

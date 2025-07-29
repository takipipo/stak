import * as esbuild from 'esbuild'
import { execSync } from 'child_process'

// Build the JavaScript bundle
esbuild.buildSync({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  logLevel: 'info',
  external: ['@aws-sdk/lib-dynamodb', '@aws-sdk/client-dynamodb'],
  outfile: 'dist/index.js'
})

// Generate TypeScript declaration files
execSync('tsc --emitDeclarationOnly --outDir dist')

import * as esbuild from 'esbuild'

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

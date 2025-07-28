import * as esbuild from 'esbuild'

// "esbuild src/index.ts --bundle --platform=node --target=node22 --format=esm --external:@aws-sdk/lib-dynamodb --external:@aws-sdk/client-dynamodb --outfile=dist/index.js && tsc --emitDeclarationOnly --outDir dist",
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

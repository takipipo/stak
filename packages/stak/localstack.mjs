#!/usr/bin/env node

import { execSync } from 'child_process'

const STACK_NAME = 'local'
const REGION = 'us-east-1'

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`)
}

function execCommand(command, options = {}) {
  try {
    const result = execSync(command, {
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options
    })
    return { success: true, output: result }
  } catch (error) {
    if (!options.silent) {
      log(`Error executing: ${command}`, colors.red)
      log(error.message, colors.red)
    }
    return { success: false, error: error.message }
  }
}

async function checkStackExists() {
  log('🔍 Checking if CloudFormation stack exists...', colors.blue)
  const result = execCommand(
    `awslocal cloudformation describe-stacks --region ${REGION} --stack-name ${STACK_NAME}`,
    { silent: true }
  )

  if (result.success) {
    log(`✅ Stack '${STACK_NAME}' exists`, colors.green)
    return true
  } else {
    log(`❌ Stack '${STACK_NAME}' does not exist`, colors.yellow)
    return false
  }
}

async function listTables() {
  log('📋 Listing DynamoDB tables...', colors.blue)
  const result = execCommand(`awslocal dynamodb list-tables --region ${REGION}`)
  return result.success
}

async function deleteAllTables() {
  log('🗑️  Deleting all DynamoDB tables...', colors.blue)
  const result = execCommand(
    `awslocal dynamodb list-tables --region ${REGION} --output text --query 'TableNames[]'`,
    { silent: true }
  )

  if (result.success && result.output.trim()) {
    const tables = result.output
      .trim()
      .split('\n')
      .filter((t) => t.trim())
    if (tables.length > 0) {
      for (const table of tables) {
        log(`  Deleting table: ${table}`, colors.yellow)
        execCommand(`awslocal dynamodb delete-table --region ${REGION} --table-name ${table}`)
      }
      log(`✅ Deleted ${tables.length} tables`, colors.green)
    } else {
      log('ℹ️  No tables to delete', colors.cyan)
    }
  } else {
    log('ℹ️  No tables to delete', colors.cyan)
  }
}

async function deleteStack() {
  log('🗑️  Deleting CloudFormation stack...', colors.blue)
  const result = execCommand(
    `samlocal delete --region ${REGION} --stack-name ${STACK_NAME} --no-prompts`
  )
  if (result.success) {
    log('✅ Stack deleted successfully', colors.green)
  }
  return result.success
}

async function buildProject() {
  log('🔨 Building project...', colors.blue)
  const result = execCommand('npm run build')
  if (result.success) {
    log('✅ Build completed successfully', colors.green)
  }
  return result.success
}

async function deployStack() {
  log('🚀 Deploying stack...', colors.blue)
  const result = execCommand(`samlocal deploy --region ${REGION} --stack-name ${STACK_NAME}`)
  if (result.success) {
    log('✅ Stack deployed successfully', colors.green)
  }
  return result.success
}

async function syncStack() {
  log('🔄 Syncing stack...', colors.blue)
  const result = execCommand(`samlocal sync --region ${REGION} --stack-name ${STACK_NAME}`)
  if (result.success) {
    log('✅ Stack synced successfully', colors.green)
  }
  return result.success
}

async function getApiInfo() {
  log('ℹ️  Getting API Gateway information...', colors.blue)
  const result = execCommand(`awslocal apigateway get-rest-apis`, { silent: true })

  if (result.success) {
    try {
      const apis = JSON.parse(result.output)
      if (apis.items && apis.items.length > 0) {
        for (const api of apis.items) {
          log(`📍 API Gateway ID: ${api.id}`, colors.green)
          log(`🔗 Base URL: http://localhost:4566/_aws/execute-api/${api.id}/Prod`, colors.cyan)
          log(`📋 Sample endpoints:`, colors.blue)
          log(
            `   GET  http://localhost:4566/_aws/execute-api/${api.id}/Prod/user/messages`,
            colors.reset
          )
          log(
            `   POST http://localhost:4566/_aws/execute-api/${api.id}/Prod/admin/v1/{tenantKey}/{inboxKey}/messages/post`,
            colors.reset
          )

          // Set environment variable for easy testing
          log(`\n🧪 Test environment variable:`, colors.yellow)
          log(`export API_GATEWAY_ID=${api.id}`, colors.cyan)
          log(
            `export API_BASE_URL=http://localhost:4566/_aws/execute-api/${api.id}/Prod`,
            colors.cyan
          )
        }
        return { success: true, apiId: apis.items[0].id }
      } else {
        log('❌ No API Gateway found', colors.yellow)
        return { success: false }
      }
    } catch (error) {
      log('❌ Failed to parse API Gateway response', colors.red)
      return { success: false }
    }
  }
  return { success: false }
}

async function showStatus() {
  log('📊 Current LocalStack Status', colors.cyan)
  log('='.repeat(50), colors.cyan)

  await checkStackExists()
  await listTables()

  log('\n🔗 API Gateway endpoints:', colors.blue)
  await getApiInfo()
}

async function cleanEnvironment() {
  log('🧹 Cleaning LocalStack environment...', colors.yellow)
  log('='.repeat(50), colors.yellow)

  const stackExists = await checkStackExists()
  if (stackExists) {
    await deleteStack()
  }

  await deleteAllTables()
  log('✅ Environment cleaned successfully', colors.green)
}

async function freshDeploy() {
  log('🆕 Fresh deployment (clean + build + deploy)...', colors.cyan)
  log('='.repeat(50), colors.cyan)

  await cleanEnvironment()

  if (await buildProject()) {
    await deployStack()
    log('🎉 Fresh deployment completed!', colors.green)
    await getApiInfo()
  } else {
    log('❌ Build failed, deployment aborted', colors.red)
  }
}

async function safeDeploy() {
  log('🛡️  Safe deployment (check + build + deploy)...', colors.cyan)
  log('='.repeat(50), colors.cyan)

  const stackExists = await checkStackExists()
  await listTables()

  if (stackExists) {
    log('⚠️  Stack already exists. This will update it.', colors.yellow)
  }

  if (await buildProject()) {
    await deployStack()
    log('🎉 Safe deployment completed!', colors.green)
    await getApiInfo()
  } else {
    log('❌ Build failed, deployment aborted', colors.red)
  }
}

async function devMode() {
  log('🚀 Development mode (fresh-deploy + sync)...', colors.cyan)
  log('='.repeat(50), colors.cyan)

  // First do a fresh deployment
  await cleanEnvironment()

  if (await buildProject()) {
    if (await deployStack()) {
      log('🎉 Fresh deployment completed!', colors.green)

      // Get API info for testing
      const apiInfo = await getApiInfo()

      if (apiInfo.success) {
        log('='.repeat(50), colors.cyan)
        log('🔄 Starting sync mode for hot-reload development...', colors.blue)
        log('='.repeat(50), colors.cyan)
        log(
          '💡 This will watch for changes and automatically sync your Lambda functions',
          colors.yellow
        )
        log('⚠️  Press Ctrl+C to stop sync mode\n', colors.yellow)

        // Start sync in foreground - this will block until interrupted
        const syncResult = execCommand(
          `samlocal sync --region ${REGION} --stack-name ${STACK_NAME}`
        )

        if (!syncResult.success) {
          log('❌ Sync mode failed to start', colors.red)
        }
      } else {
        log('❌ Could not get API Gateway information, but deployment succeeded', colors.yellow)
        log('🔄 You can manually start sync with: npm run localstack:sync', colors.cyan)
      }
    } else {
      log('❌ Deployment failed, aborting dev mode', colors.red)
    }
  } else {
    log('❌ Build failed, aborting dev mode', colors.red)
  }
}

function showHelp() {
  log('🚀 LocalStack Management Script', colors.cyan)
  log('='.repeat(50), colors.cyan)
  log('Usage: node localstack.mjs <command>', colors.blue)
  log('')
  log('Commands:', colors.green)
  log('  status           Show current LocalStack status')
  log('  dev              🚀 Fresh deploy + start sync mode (recommended for development)')
  log('  deploy           Deploy stack (same as sam deploy)')
  log('  sync             Sync stack for development')
  log('  safe-deploy      Check environment and deploy safely')
  log('  fresh-deploy     Clean everything and deploy fresh')
  log('  clean            Clean stacks and tables')
  log('  build            Build the project')
  log('  info             Show API Gateway endpoints')
  log('  list-tables      List all DynamoDB tables')
  log('  delete-tables    Delete all DynamoDB tables')
  log('  help             Show this help message')
  log('')
  log('Examples:', colors.yellow)
  log('  node localstack.mjs dev          # 🚀 Start development (most common)')
  log('  node localstack.mjs status       # Check current state')
  log('  node localstack.mjs fresh-deploy # Deploy without sync')
}

// Main execution
const command = process.argv[2]

switch (command) {
  case 'status':
    await showStatus()
    break
  case 'dev':
    await devMode()
    break
  case 'deploy':
    if (await buildProject()) {
      await deployStack()
    }
    break
  case 'sync':
    if (await buildProject()) {
      await syncStack()
    }
    break
  case 'safe-deploy':
    await safeDeploy()
    break
  case 'fresh-deploy':
    await freshDeploy()
    break
  case 'clean':
    await cleanEnvironment()
    break
  case 'build':
    await buildProject()
    break
  case 'info':
    await getApiInfo()
    break
  case 'list-tables':
    await listTables()
    break
  case 'delete-tables':
    await deleteAllTables()
    break
  case 'help':
  case undefined:
    showHelp()
    break
  default:
    log(`❌ Unknown command: ${command}`, colors.red)
    log('Run "node localstack.mjs help" for usage information', colors.yellow)
    process.exit(1)
}

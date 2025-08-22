# Stak Development Makefile
.PHONY: help check-deps install-deps dev dev-setup dev-start dev-stop dev-logs clean

# Default target
help: ## Show this help message
	@echo "Stak Development Commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# Dependency checks
check-deps: ## Check if all required dependencies are installed
	@echo "Checking dependencies..."
	@command -v docker >/dev/null 2>&1 || (echo "❌ Docker is not installed" && exit 1)
	@command -v pipx >/dev/null 2>&1 || (echo "❌ pipx is not installed. Install with: brew install pipx" && exit 1)
	@command -v awslocal >/dev/null 2>&1 || (echo "❌ awslocal is not installed. Run: make install-deps" && exit 1)
	@command -v samlocal >/dev/null 2>&1 || (echo "❌ samlocal is not installed. Run: make install-deps" && exit 1)
	@command -v npm >/dev/null 2>&1 || (echo "❌ npm is not installed" && exit 1)
	@echo "✅ All dependencies are installed"

# Install required dependencies
install-deps: ## Install awslocal and samlocal via pipx
	@echo "Installing AWS LocalStack tools..."
	pipx install awscli-local
	pipx install aws-sam-cli-local
	@echo "✅ Dependencies installed successfully"

# Development workflow
dev-setup: check-deps ## Set up development environment
	@echo "Setting up development environment..."
	npm install
	npm run build -w packages/shared
	@echo "✅ Development environment ready"

dev-start: ## Start LocalStack and related services
	@echo "Starting LocalStack..."
	npm run infra:local:up
	@echo "Waiting for LocalStack to be ready..."
	@until curl -s http://localhost:4566/_localstack/health | grep -q "running"; do \
		echo "Waiting for LocalStack..."; \
		sleep 2; \
	done
	@echo "✅ LocalStack is running"

dev-stop: ## Stop LocalStack and related services
	@echo "Stopping LocalStack..."
	npm run infra:local:down
	@echo "✅ LocalStack stopped"

dev-logs: ## Show LocalStack logs
	cd infra/local && docker compose logs -f

dev: dev-setup dev-start ## Full development setup (install deps, start services)

# SAM Local development
sam-sync: ## Start sam sync for fast development iteration
	cd packages/stak && samlocal sync --stack-name stak-local

sam-build: ## Build SAM application
	cd packages/stak && npm run build

sam-deploy-local: ## Deploy to LocalStack
	cd packages/stak && samlocal deploy --stack-name stak-local

# Testing
test: ## Run tests
	npm test -w packages/stak

test-shared: ## Run shared package tests
	npm test -w packages/shared

# Cleanup
clean: ## Clean up build artifacts and containers
	cd infra/local && docker compose down -v
	cd packages/stak && rm -rf .aws-sam
	cd packages/shared && rm -rf dist
	npm run clean -w packages/shared
	@echo "✅ Cleanup complete"

# Build targets
build: ## Build all packages
	npm run build -w packages/shared
	npm run build -w packages/stak

# Status check
status: ## Check status of local services
	@echo "LocalStack status:"
	@curl -s http://localhost:4566/health 2>/dev/null | jq '.' || echo "LocalStack not running"
	@echo ""
	@echo "Docker containers:"
	@docker ps --filter "name=stak-localstack"

Stak
==

# Development

## Make Ready!

Warning since we are using free localstack the state does not persist!. Hence every reload the stack will be deleeted. Please start over.

```bash
npm run infra:local:up # bring up your local development infrastructure
npm run -w packages/stak locakstack:deploy # Deploy your stack to Localstack
```

## Get your endpoint

```bash
npm run -w packages/stak localstack:info # list the endpoint
```

## Delist your environment

```bash
npm run -w packages/stak localstack:delete # remove your endpoint from your infrastructure
```

## Hot-reload

```bash
npm run -w packages/stak locakstack:sync # test against your local development
```

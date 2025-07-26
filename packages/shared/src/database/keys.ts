// DynamoDB key generation utilities for single-table design

export function createPartitionKey(
  tenantKey: string,
  uid: string,
  inboxKey: string = 'DEFAULT'
): string {
  return `t#${tenantKey}U#${uid}#${inboxKey}`
}

export function createPublicPartitionKey(tenantKey: string, inboxKey: string = 'DEFAULT'): string {
  return `t#${tenantKey}G#$public#${inboxKey}`
}

export function createMessageSortKey(messageId: string): string {
  return `m#${messageId}`
}

export function createStatsSortKey(): string {
  return 'c#*'
}

export function createCategoryStatsSortKey(categoryKey: string): string {
  return `c#${categoryKey}`
}

export function createTenantSettingsSortKey(): string {
  return 'st#tenant_settings'
}

export function createInboxConfigSortKey(inboxKey: string): string {
  return `si#${inboxKey}`
}


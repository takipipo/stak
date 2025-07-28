// Base types for Stak messaging system

export interface MessageAudience {
  kind: 'users' | 'everyone';
  label: string;
  uids?: string[];
}

export interface MessageHeaders {
  id: string;
  host_system_id?: string;
  sender: string;
  audiences: MessageAudience;
  received: number;
  delivered: number;
}

export interface MessageTaxonomy {
  category: string;
}

export interface MessageBody {
  title: string;
  body: string | any;
  cta_uri?: string;
}

export interface UserMessage {
  kind: 'UM';
  headers: MessageHeaders;
  readat?: number;
  expiredat: number;
  taxonomy: MessageTaxonomy;
  message: MessageBody;
  tenant_key: string;
  inbox_key: string;
  uid: string;
}

export interface ReadReceipt {
  taxonomy?: MessageTaxonomy;
  readat: number;
  expiredat: number;
}

export interface UserStats {
  kind: 'US';
  read?: number;
  published: number;
  tenant_key: string;
  inbox_key: string;
  uid: string;
}

export interface TenantSettings {
  kind: 'TS';
  title: string;
  ttl: string;
  tenant_key: string;
  uid: string;
}

export interface InboxConfig {
  kind: 'IC';
  title: string;
  description: string;
  ttl: {
    default: string;
    [type: string]: string;
  };
  tenant_key: string;
  inbox_key: string;
  uid: string;
}
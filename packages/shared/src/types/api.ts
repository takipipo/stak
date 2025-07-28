// API payload interfaces for Stak service
import type { UserMessage } from './base.js';

// Admin API payloads
export interface AdminSendMessageRequest {
  headers: {
    host_system_id?: string;
    audiences: {
      kind: 'users' | 'everyone';
      label: string;
      uids?: string[];
    };
  };
  taxonomy?: {
    category: string;
  };
  message: {
    title: string;
    body: string | any;
    cta_uri?: string;
  };
}

export interface AdminSendMessageResponse {
  success: true;
  data: {
    id: string;
    estimate_recipient: number;
  };
}

export interface AdminRedactMessageRequest {
  id: string;
}

export interface AdminRedactMessageResponse {
  success: true;
  data: {
    id: string;
    estimate_recipient: number;
  };
}

// User API payloads
export interface UserMarkMessagesReadRequest {
  messages: string[]; // maximum 50 messages
}

export interface UserMarkMessagesReadResponse {
  success: true;
  receipts: Array<{
    id: string;
    readat: number;
  }>;
}

export interface UserMarkAllReadRequest {
  after: number; // epoch timestamp
}

export interface UserMarkAllReadResponse {
  success: true;
  receipts: {
    id: string; // maximum message id that was marked as read
  };
}

export interface UserGetMessagesResponse {
  success: true;
  paging: {
    estimate_count: number;
    count: number;
    next_token?: string;
  };
  messages: UserMessage[];
}

// Path parameters interfaces
export interface AdminApiPathParams {
  tenant_key: string;
  inbox_key: string;
}

export interface UserApiPathParams {
  tenant_key: string;
  inbox_key: string;
}

export interface UserGetMessagesPathParams extends UserApiPathParams {
  limit: string; // numeric string
}

// Query parameters interfaces
export interface UserGetMessagesQueryParams {
  next?: string; // next_token
}
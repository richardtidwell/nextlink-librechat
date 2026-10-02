import request from './request';
export interface NextlinkToolCall {
  id: string;
  server: string;
  tool: string;
  arguments: Record<string, unknown>;
  status: string;
  approval?: string;
  result?: string;
}
export interface NextlinkState {
  conversationId: string;
  running: boolean;
  servers: { id: string; name: string; enabled: boolean; toolCount: number }[];
  selected: string[];
  pending: NextlinkToolCall[];
  tools: NextlinkToolCall[];
  permissions: { serverId: string; server: string; tool: string }[];
  metadata: {
    actualModel?: string;
    model?: string;
    cost?: number;
    routerBackend?: string;
    reused?: boolean;
  } | null;
}
const endpoint = (id: string) => `/api/nextlink/${encodeURIComponent(id)}`;
export const nextlinkService = {
  get: (id: string) => request.get<NextlinkState>(endpoint(id)),
  select: (id: string, mcpServerIds: string[]) =>
    request.patch(`${endpoint(id)}/connectors`, { mcpServerIds }),
  approve: (id: string, callId: string, allow: boolean, always: boolean) =>
    request.post(`${endpoint(id)}/approval`, { id: callId, allow, always }),
  revoke: (id: string, serverId: string, tool: string) =>
    request.deleteWithOptions(`${endpoint(id)}/permissions`, { data: { serverId, tool } }),
};

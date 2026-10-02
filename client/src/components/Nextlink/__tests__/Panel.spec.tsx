import React from 'react';
import { nextlinkService } from 'librechat-data-provider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { NextlinkState } from 'librechat-data-provider';
import Panel from '../Panel';

const state: NextlinkState = {
  conversationId: 'backend-chat',
  running: false,
  servers: [{ id: 'fixture', name: 'Fixture', enabled: true, toolCount: 1 }],
  selected: [],
  pending: [],
  tools: [],
  permissions: [],
  metadata: null,
};
function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, cacheTime: 0 }, mutations: { retry: false } },
    logger: { log: console.log, warn: console.warn, error: () => {} },
  });
  return render(
    <QueryClientProvider client={client}>
      <Panel conversationId="chat-a" isSubmitting={false} />
    </QueryClientProvider>,
  );
}
it('shows loading, then changes only the current conversation connector selection', async () => {
  let resolve!: (value: NextlinkState) => void;
  jest.spyOn(nextlinkService, 'get').mockReturnValue(
    new Promise((r) => {
      resolve = r;
    }),
  );
  jest.spyOn(nextlinkService, 'select').mockResolvedValue({});
  mount();
  expect(screen.getByRole('status')).toHaveTextContent('Connecting');
  resolve(state);
  fireEvent.click(screen.getByText('Connectors'));
  const toggle = await screen.findByRole('switch', { name: 'Fixture' });
  fireEvent.click(toggle);
  await waitFor(() => expect(nextlinkService.select).toHaveBeenCalledWith('chat-a', ['fixture']));
});
it('shows actionable failure without exposing server errors', async () => {
  jest.spyOn(nextlinkService, 'get').mockRejectedValue(new Error('secret provider payload'));
  mount();
  const alert = await screen.findByRole('alert', {}, { timeout: 5000 });
  expect(alert).toHaveTextContent('Workspace controls are unavailable');
  expect(alert).not.toHaveTextContent('secret');
  expect(screen.getByRole('button', { name: 'Retry' })).toBeVisible();
});
it('allows a pending tool for this chat and exposes revocation of saved grants', async () => {
  jest.spyOn(nextlinkService, 'get').mockResolvedValue({
    ...state,
    pending: [
      {
        id: 'call-a',
        server: 'Fixture',
        tool: 'lookup',
        arguments: { city: 'Demo' },
        status: 'awaiting',
      },
    ],
    permissions: [{ serverId: 'fixture', server: 'Fixture', tool: 'lookup' }],
  });
  jest.spyOn(nextlinkService, 'approve').mockResolvedValue({});
  jest.spyOn(nextlinkService, 'revoke').mockResolvedValue({});
  mount();
  fireEvent.click(await screen.findByRole('button', { name: 'Always allow in this chat' }));
  await waitFor(() =>
    expect(nextlinkService.approve).toHaveBeenCalledWith('chat-a', 'call-a', true, true),
  );
  fireEvent.click(screen.getByText(/Connectors/, { selector: 'summary' }));
  const revoke = screen.getByRole('button', { name: 'Revoke' });
  await waitFor(() => expect(revoke).toBeEnabled());
  fireEvent.click(revoke);
  await waitFor(() =>
    expect(nextlinkService.revoke).toHaveBeenCalledWith('chat-a', 'fixture', 'lookup'),
  );
});

it('follows the server-created chat while the route still points at new, then stops showing its approval after completion', async () => {
  const get = jest.spyOn(nextlinkService, 'get').mockImplementation(async (id) => ({
    ...state,
    running: id === 'server-chat',
    pending:
      id === 'server-chat'
        ? [
            {
              id: 'first-call',
              server: 'Fixture',
              tool: 'lookup',
              arguments: {},
              status: 'awaiting approval',
            },
          ]
        : [],
  }));
  const approve = jest.spyOn(nextlinkService, 'approve').mockResolvedValue({});
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, cacheTime: 0 } } });
  const tree = (activeConversationId?: string) => (
    <QueryClientProvider client={client}>
      <Panel conversationId="new" activeConversationId={activeConversationId} isSubmitting />
    </QueryClientProvider>
  );
  const view = render(tree());
  await waitFor(() => expect(get).toHaveBeenCalledWith('new'));
  expect(screen.queryByRole('button', { name: 'Allow once' })).not.toBeInTheDocument();
  view.rerender(tree('server-chat'));
  fireEvent.click(await screen.findByRole('button', { name: 'Allow once' }));
  await waitFor(() =>
    expect(approve).toHaveBeenCalledWith('server-chat', 'first-call', true, false),
  );
  view.rerender(
    <QueryClientProvider client={client}>
      <Panel
        conversationId="another-chat"
        activeConversationId="server-chat"
        isSubmitting={false}
      />
    </QueryClientProvider>,
  );
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'Allow once' })).not.toBeInTheDocument(),
  );
});
it('shows actual usage and reasoning-token details without inventing a thinking transcript', async () => {
  jest.spyOn(nextlinkService, 'get').mockResolvedValue({
    ...state,
    metadata: {
      actualModel: 'fixture-model',
      model: 'fixture-model',
      routerBackend: 'fixture-router',
      latencyMs: 12000,
      providerUsage: {
        prompt_tokens: 120,
        completion_tokens: 40,
        completion_tokens_details: { reasoning_tokens: 15 },
      },
    },
  });
  mount();
  fireEvent.click(await screen.findByText(/Tool activity/));
  expect(screen.getByText(/120 input.*40 output tokens/)).toHaveTextContent('15 reasoning tokens');
  expect(screen.queryByText('Reasoning summary')).not.toBeInTheDocument();
});

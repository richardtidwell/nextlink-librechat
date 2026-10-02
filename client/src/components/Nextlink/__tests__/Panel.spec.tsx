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

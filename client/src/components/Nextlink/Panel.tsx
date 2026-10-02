import { useEffect, useState } from 'react';
import { Switch } from '@librechat/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { nextlinkService, QueryKeys, MutationKeys } from 'librechat-data-provider';
import useLocalize from '~/hooks/useLocalize';
import { Button } from './ui/button';
import Activity from './Activity';

export default function Panel({
  conversationId: routeConversationId,
  activeConversationId,
  isSubmitting,
  placement = 'all',
}: {
  conversationId: string;
  activeConversationId?: string | null;
  isSubmitting: boolean;
  placement?: 'all' | 'controls' | 'activity';
}) {
  // Resumable streaming changes the URL with replaceState before React Router
  // observes it. The server-created conversation state already has the real ID.
  const conversationId =
    isSubmitting && activeConversationId && activeConversationId !== 'new'
      ? activeConversationId
      : routeConversationId;
  const localize = useLocalize();
  const client = useQueryClient();
  const queryKey = [QueryKeys.nextlink, conversationId];
  const query = useQuery(queryKey, () => nextlinkService.get(conversationId), {
    refetchInterval: isSubmitting ? 800 : 4000,
    refetchIntervalInBackground: true,
    retry: 1,
  });
  const mutation = useMutation({
    mutationKey: [MutationKeys.nextlink, conversationId],
    mutationFn: (run: () => Promise<unknown>) => run(),
    onSuccess: () => client.invalidateQueries(queryKey),
  });
  const data = query.data;
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!isSubmitting && !data?.running) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isSubmitting, data?.running]);
  return (
    <section
      className="text-text-primary mx-auto w-full max-w-3xl px-4 pb-2 text-sm xl:max-w-4xl"
      aria-label={localize('com_nextlink_workspace')}
      data-conversation-id={conversationId}
    >
      {placement !== 'activity' && (
        <div className="border-border-light flex flex-wrap items-center gap-3 border-b py-2">
          <span className="text-text-secondary mr-auto text-xs">
            {localize('com_nextlink_routing_auto')}
          </span>
          <a
            className="text-link text-xs underline-offset-4 hover:underline"
            href="http://127.0.0.1:3000"
            target="_blank"
            rel="noreferrer"
          >
            {localize('com_nextlink_original')}
          </a>
          <details className="relative">
            <summary className="border-border-medium cursor-pointer rounded-md border px-3 py-2">
              {localize('com_nextlink_connectors')}{' '}
              {data
                ? `(${data.servers.filter((s) => s.enabled && data.selected.includes(s.id)).length})`
                : ''}
            </summary>
            <div className="border-border-medium bg-surface-dialog absolute right-0 bottom-full z-50 mb-2 max-h-96 w-80 max-w-[85vw] overflow-y-auto rounded-lg border p-4 shadow-lg">
              <p className="text-text-secondary mb-3 text-xs">{localize('com_nextlink_scope')}</p>
              {data?.servers.map((server) => (
                <label
                  key={server.id}
                  className="border-border-light flex items-center justify-between gap-3 border-b py-3"
                >
                  <span>
                    {server.name}
                    <small className="text-text-secondary block text-xs">
                      {server.enabled
                        ? localize('com_nextlink_tool_count', { count: server.toolCount })
                        : localize('com_nextlink_unavailable')}
                    </small>
                  </span>
                  <Switch
                    aria-label={server.name}
                    checked={server.enabled && data.selected.includes(server.id)}
                    disabled={!server.enabled || isSubmitting || data.running || mutation.isLoading}
                    onCheckedChange={() =>
                      mutation.mutate(() =>
                        nextlinkService.select(
                          conversationId,
                          data.selected.includes(server.id)
                            ? data.selected.filter((id) => id !== server.id)
                            : [...data.selected, server.id],
                        ),
                      )
                    }
                  />
                </label>
              ))}
              {data?.permissions.length ? (
                <h3 className="mt-4 font-medium">{localize('com_nextlink_permissions')}</h3>
              ) : null}
              {data?.permissions.map((p) => (
                <div key={`${p.serverId}/${p.tool}`} className="flex items-center gap-2 py-2">
                  <span className="min-w-0 flex-1 text-xs break-words">
                    {p.server} · {p.tool}
                  </span>
                  <Button
                    size="xs"
                    variant="outline"
                    disabled={mutation.isLoading}
                    onClick={() =>
                      mutation.mutate(() =>
                        nextlinkService.revoke(conversationId, p.serverId, p.tool),
                      )
                    }
                  >
                    {localize('com_nextlink_revoke')}
                  </Button>
                </div>
              ))}
              <a
                className="text-link mt-4 block text-xs"
                href="http://127.0.0.1:3000/#mcp"
                target="_blank"
                rel="noreferrer"
              >
                {localize('com_nextlink_manage')}
              </a>
            </div>
          </details>
        </div>
      )}
      {placement !== 'activity' && query.isLoading && (
        <p role="status" className="text-text-secondary py-2 text-xs">
          {localize('com_nextlink_loading')}
        </p>
      )}
      {(query.isError || mutation.isError) && (
        <div role="alert" className="text-text-destructive flex items-center gap-2 py-2">
          <span>{localize('com_nextlink_error')}</span>
          <Button
            variant="outline"
            size="xs"
            onClick={() => {
              mutation.reset();
              void query.refetch();
            }}
          >
            {localize('com_nextlink_retry')}
          </Button>
        </div>
      )}
      {placement !== 'controls' && data && <Activity data={data} now={now} />}
      {placement !== 'controls' &&
        data?.pending.map((call) => (
          <div
            key={call.id}
            role="alert"
            aria-label={localize('com_nextlink_approval_needed')}
            className="border-border-medium bg-surface-secondary my-2 rounded-lg border p-4"
          >
            <h3 className="mb-2 font-semibold">{localize('com_nextlink_approval_needed')}</h3>
            <strong>
              {call.server} · {call.tool}
            </strong>
            <p className="text-text-secondary mt-2 text-xs">{localize('com_nextlink_approval')}</p>
            <pre className="my-3 max-h-32 overflow-auto text-xs whitespace-pre-wrap">
              {JSON.stringify(call.arguments, null, 2)}
            </pre>
            {call.expiresAt && (
              <p className="text-text-secondary mb-3 text-xs">
                {localize('com_nextlink_expires', {
                  seconds: Math.max(0, Math.ceil((Date.parse(call.expiresAt) - now) / 1000)),
                })}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={mutation.isLoading}
                onClick={() =>
                  mutation.mutate(() =>
                    nextlinkService.approve(conversationId, call.id, true, false),
                  )
                }
              >
                {localize('com_nextlink_allow')}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={mutation.isLoading}
                onClick={() =>
                  mutation.mutate(() =>
                    nextlinkService.approve(conversationId, call.id, true, true),
                  )
                }
              >
                {localize('com_nextlink_always')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={mutation.isLoading}
                onClick={() =>
                  mutation.mutate(() =>
                    nextlinkService.approve(conversationId, call.id, false, false),
                  )
                }
              >
                {localize('com_nextlink_deny')}
              </Button>
            </div>
          </div>
        ))}
    </section>
  );
}

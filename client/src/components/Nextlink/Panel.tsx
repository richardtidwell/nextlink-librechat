import { Switch } from '@librechat/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { nextlinkService, QueryKeys, MutationKeys } from 'librechat-data-provider';
import useLocalize from '~/hooks/useLocalize';
import { Button } from './ui/button';

export default function Panel({
  conversationId,
  isSubmitting,
}: {
  conversationId: string;
  isSubmitting: boolean;
}) {
  const localize = useLocalize();
  const client = useQueryClient();
  const queryKey = [QueryKeys.nextlink, conversationId];
  const query = useQuery(queryKey, () => nextlinkService.get(conversationId), {
    refetchInterval: isSubmitting ? 800 : 4000,
    retry: 1,
  });
  const mutation = useMutation({
    mutationKey: [MutationKeys.nextlink, conversationId],
    mutationFn: (run: () => Promise<unknown>) => run(),
    onSuccess: () => client.invalidateQueries(queryKey),
  });
  const data = query.data;
  return (
    <section
      className="text-text-primary mx-auto w-full max-w-3xl px-4 pb-2 text-sm xl:max-w-4xl"
      aria-label={localize('com_nextlink_workspace')}
    >
      <div className="border-border-light flex flex-wrap items-center gap-3 border-b py-3">
        <img src="/assets/nextlink/nextlink-icon.png" alt="" className="h-7 w-7" />
        <div className="mr-auto">
          <strong className="block font-semibold tracking-wide">
            {localize('com_nextlink_brand')}
          </strong>
          <span className="text-text-secondary text-xs">{localize('com_nextlink_auto')}</span>
        </div>
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
      {query.isLoading && (
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
      {data?.pending.map((call) => (
        <div
          key={call.id}
          className="border-border-medium bg-surface-secondary my-2 rounded-lg border p-4"
        >
          <strong>
            {call.server} · {call.tool}
          </strong>
          <p className="text-text-secondary mt-2 text-xs">{localize('com_nextlink_approval')}</p>
          <pre className="my-3 max-h-32 overflow-auto text-xs whitespace-pre-wrap">
            {JSON.stringify(call.arguments, null, 2)}
          </pre>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={mutation.isLoading}
              onClick={() =>
                mutation.mutate(() => nextlinkService.approve(conversationId, call.id, true, false))
              }
            >
              {localize('com_nextlink_allow')}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={mutation.isLoading}
              onClick={() =>
                mutation.mutate(() => nextlinkService.approve(conversationId, call.id, true, true))
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
      {data?.tools.length ? (
        <details className="text-text-secondary py-2 text-xs">
          <summary className="cursor-pointer">
            {localize('com_nextlink_activity')} ({data.tools.length})
          </summary>
          {data.tools.map((call) => (
            <div key={call.id} className="border-border-medium my-2 border-l-2 pl-3">
              <strong>
                {call.server} · {call.tool}
              </strong>
              <p>
                {call.status}
                {call.approval === 'always' ? ` · ${localize('com_nextlink_always')}` : ''}
              </p>
              <pre className="max-h-40 overflow-auto break-words whitespace-pre-wrap">
                {call.result || JSON.stringify(call.arguments)}
              </pre>
            </div>
          ))}
        </details>
      ) : null}
      {data?.metadata && !data.running && (
        <p className="text-text-secondary py-2 text-xs">
          {data.metadata.reused
            ? localize('com_nextlink_reused')
            : data.metadata.actualModel || data.metadata.model}
          {data.metadata.routerBackend ? ` · ${data.metadata.routerBackend}` : ''}
          {data.metadata.cost != null ? ` · $${data.metadata.cost.toFixed(5)}` : ''}
        </p>
      )}
    </section>
  );
}

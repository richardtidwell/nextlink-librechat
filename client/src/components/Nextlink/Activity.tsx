import type { NextlinkState } from 'librechat-data-provider';
import useLocalize from '~/hooks/useLocalize';

export default function Activity({ data, now }: { data: NextlinkState; now: number }) {
  const localize = useLocalize();
  const m = data.metadata;
  if (!m && !data.running && !data.tools.length) return null;
  const elapsed = data.running && m?.startedAt ? now - Date.parse(m.startedAt) : m?.latencyMs;
  let status = localize('com_nextlink_activity');
  if (m?.stage === 'cancelled') status = localize('com_nextlink_stopped');
  if (m?.stage === 'failed') status = localize('com_nextlink_failed');
  if (data.running) {
    status = localize('com_nextlink_generating');
    if (m?.stage === 'routing') status = localize('com_nextlink_selecting');
    if (m?.stage === 'tool') status = localize('com_nextlink_running_tool');
  }
  if (data.pending.length) status = localize('com_nextlink_waiting');
  const toolStatus: Record<string, string> = {
    'checking approval': localize('com_nextlink_checking_approval'),
    'awaiting approval': localize('com_nextlink_waiting'),
    running: localize('com_nextlink_running_tool'),
    complete: localize('com_nextlink_complete'),
    denied: localize('com_nextlink_denied'),
    expired: localize('com_nextlink_expired'),
    failed: localize('com_nextlink_failed'),
    cancelled: localize('com_nextlink_stopped'),
    'outcome unknown': localize('com_nextlink_outcome_unknown'),
  };
  const usage = m?.providerUsage;
  const reasoning = usage?.completion_tokens_details?.reasoning_tokens;
  return (
    <details open={data.running} className="text-text-secondary py-2 text-xs">
      <summary className="cursor-pointer py-1">
        <span role="status" aria-live="polite">
          {status}
        </span>
        {elapsed != null && ` · ${Math.max(0, Math.round(elapsed / 1000))}s`}
        {m?.actualModel && ` · ${m.actualModel}`}
      </summary>
      <div className="border-border-light mt-2 max-h-52 space-y-3 overflow-auto border-l-2 pl-3">
        {m?.model && (
          <p>
            {localize('com_nextlink_routed', {
              model: m.actualModel || m.model,
              router: m.routerBackend || 'auto',
            })}
          </p>
        )}
        {m?.reasoningEffort && (
          <p>{localize('com_nextlink_reasoning_effort', { effort: m.reasoningEffort })}</p>
        )}
        {m?.reasoningSummary && (
          <details open>
            <summary>{localize('com_nextlink_reasoning_summary')}</summary>
            <p className="mt-2 whitespace-pre-wrap">{m.reasoningSummary}</p>
          </details>
        )}
        {data.tools
          .filter((call) => call.status !== 'awaiting approval')
          .map((call) => (
            <details key={call.id}>
              <summary className="cursor-pointer break-words">
                <strong>
                  {call.server} · {call.tool}
                </strong>{' '}
                · {toolStatus[call.status] || localize('com_nextlink_outcome_unknown')}
                {call.latencyMs != null && ` · ${(call.latencyMs / 1000).toFixed(1)}s`}
              </summary>
              <pre className="mt-2 max-h-40 overflow-auto break-words whitespace-pre-wrap">
                {JSON.stringify(call.arguments, null, 2)}
              </pre>
              {call.result && (
                <pre className="mt-2 max-h-40 overflow-auto break-words whitespace-pre-wrap">
                  {call.result}
                </pre>
              )}
              {call.approval === 'always' && <p>{localize('com_nextlink_always')}</p>}
            </details>
          ))}
        {usage && (
          <p>
            {localize('com_nextlink_tokens', {
              input: usage.prompt_tokens,
              output: usage.completion_tokens,
            })}
            {reasoning != null
              ? ` · ${localize('com_nextlink_reasoning_tokens', { count: reasoning })}`
              : ` · ${localize('com_nextlink_reasoning_unreported')}`}
          </p>
        )}
        {!!m?.generationCalls?.length && (
          <p>{localize('com_nextlink_model_calls', { count: m.generationCalls.length })}</p>
        )}
        {m?.cost != null && <p>{localize('com_nextlink_cost', { cost: m.cost.toFixed(5) })}</p>}
        {m?.reused && <p>{localize('com_nextlink_reused')}</p>}
      </div>
    </details>
  );
}

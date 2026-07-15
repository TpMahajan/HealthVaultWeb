/**
 * Merges a fresh server snapshot of chat messages with the current local
 * list instead of replacing it wholesale.
 *
 * A poll/SSE-triggered reload that lands while a send is still in flight
 * must never erase the optimistic (`pending`) or `failed` bubble for a
 * message the server doesn't know about yet — the previous
 * `setMessages(serverArray)` unconditional replace is exactly what caused
 * a doctor's just-sent message to visibly disappear then reappear. Local
 * `pending`/`failed` entries are kept until the server snapshot actually
 * contains their `clientMessageId`; everything else defers to the server
 * as the source of truth.
 *
 * Sorted by `createdAt` (server timestamp) ascending, with a stable
 * fallback (original merge order) when timestamps tie or are missing.
 *
 * @param {{serverMessages: Array<object>, localMessages: Array<object>}} args
 * @returns {Array<object>}
 */
export function mergeChatMessages({ serverMessages, localMessages }) {
  const serverClientIds = new Set(
    (serverMessages || [])
      .map((entry) => String(entry?.clientMessageId || ""))
      .filter((id) => id.length > 0)
  );

  const stillLocalOnly = (localMessages || []).filter((entry) => {
    const isLocalState = entry?.pending === true || entry?.failed === true;
    if (!isLocalState) return false;
    const clientId = String(entry?.clientMessageId || "");
    return clientId.length === 0 || !serverClientIds.has(clientId);
  });

  const merged = [...(serverMessages || []), ...stillLocalOnly];

  return merged
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => {
      const aTime = a.entry?.createdAt ? new Date(a.entry.createdAt).getTime() : NaN;
      const bTime = b.entry?.createdAt ? new Date(b.entry.createdAt).getTime() : NaN;
      const aValid = Number.isFinite(aTime);
      const bValid = Number.isFinite(bTime);
      if (aValid && bValid && aTime !== bTime) return aTime - bTime;
      if (aValid && !bValid) return -1;
      if (!aValid && bValid) return 1;
      // Stable fallback when timestamps tie or are unparsable.
      return a.index - b.index;
    })
    .map(({ entry }) => entry);
}

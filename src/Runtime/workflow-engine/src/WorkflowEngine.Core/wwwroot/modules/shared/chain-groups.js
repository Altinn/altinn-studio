/* Collection groups — the group chrome around shared chain rows, used by the Recent
 * section's Chains view and the Query tab's chains mode. Owns the per-collection
 * full-graph history cache and the history control, and the per-collection mailbox cache. */

import { state, workflowData } from '../core/state.js';
import {
    abbrevGuids,
    esc,
    escAttr,
    escJsArg,
    fmtAgo,
    fmtTime,
    formatElapsed,
    formatSpan,
} from '../core/helpers.js';
import {
    buildFilterText,
    buildLabelsHTML,
    buildStatusTags,
    collectionButtonHTML,
} from './cards.js';
import {
    buildSpineByCreation,
    buildSpineFromEdges,
    renderChainList,
    revealChainRow,
} from './chain.js';

/** @typedef {import('../core/state.js').Workflow} Workflow */
/** @typedef {import('../core/state.js').Mailbox} Mailbox */
/** @typedef {import('../core/state.js').MailboxPosition} MailboxPosition */

/**
 * Full-graph cache per collectionKey, populated by the per-group history control.
 * Shared across surfaces: history loaded from Recent is instantly available in Query.
 * @type {Map<string, { nodes: Workflow[], edges: { from: string, to: string, kind: string }[], truncated: boolean }>}
 */
const historyCache = new Map();

/** collectionKeys with a history refetch in flight (avoids refetch storms) */
const historyRefreshing = new Set();

/** Re-render callbacks, one per chains surface, invoked when a history graph (re)loads. */
const rerenderHooks = new Set();

/** @param {() => void} fn */
export const onChainGroupsChanged = (fn) => {
    rerenderHooks.add(fn);
};

/* ── Mailboxes ───────────────────────────────────────────── */

/**
 * Per-collection mailboxes from `/dashboard/mailboxes` — fetched, since the live stream carries none.
 * @type {Map<string, { mailboxes: Mailbox[], truncated: boolean }>}
 */
const mailboxCache = new Map();

const mailboxFetchedAt = new Map();

/** Collections with a read in flight — the `historyRefreshing` pattern: never two at once. */
const mailboxInFlight = new Set();

/**
 * Wants per namespace, flushed as one batch: the endpoint applies its bound per key, which one request
 * per group would defeat.
 * @type {Map<string, Set<string>>}
 */
const mailboxWanted = new Map();

/**
 * What the last completed pass drew — deliberately not the DOM's blocks: a collection whose blocks are
 * missing is exactly the one to ask again.
 * @type {Map<string, { ns: string, key: string, hinted: boolean }>}
 */
let mailboxOnScreen = new Map();

let mailboxThisPass = new Map();

let mailboxSeen = false;

/**
 * Bounded by encoded length, not count: 100 long keys overrun Kestrel's 8 KB request line (`414`).
 */
const MAILBOX_KEYS_BYTES_MAX = 4096;

/**
 * The endpoint honors 100 keys and drops the rest silently.
 */
const MAILBOX_KEY_CAP = 100;

const MAILBOX_TTL_MS = 3000;

/**
 * TTL for a collection that answered "no mailboxes" and shows no receiver — nearly every collection,
 * forever, so re-asking every few seconds would put the three-table read on a loop.
 */
const MAILBOX_IDLE_TTL_MS = 60000;

const MAILBOX_CACHE_MAX = 200;

const MAILBOX_POLL_MS = 5000;

let _mailboxPassTimer = 0;
let _mailboxPoll = 0;

/**
 * Namespaced: a collection key is only unique within its namespace.
 */
const mailboxCacheKey = (ns, key) => `${ns}\u0000${key}`;

/** What an unread collection compares equal to, so "no mailbox, still no mailbox" is not a change. */
const NO_MAILBOXES = { mailboxes: [], truncated: false };

/**
 * Staleness budget. An empty, unhinted collection is asked rarely; everything else promptly — including
 * one never read successfully, because a failed request must never be remembered as an empty answer.
 */
const mailboxTtl = (id, hinted) => {
    if (hinted) return MAILBOX_TTL_MS;
    const entry = mailboxCache.get(id);
    if (!entry) return MAILBOX_TTL_MS;
    return entry.mailboxes.length ? MAILBOX_TTL_MS : MAILBOX_IDLE_TTL_MS;
};

/**
 * Split keys into requests that fit the request line. An over-long key goes out alone: its `414` is the
 * server's answer to give.
 */
const mailboxKeyChunks = (keys) => {
    /** @type {string[][]} */
    const chunks = [];
    /** @type {string[]} */
    let chunk = [];
    let bytes = 0;
    for (const key of keys) {
        const cost = encodeURIComponent(key).length + 3; // + the encoded comma
        const full = bytes + cost > MAILBOX_KEYS_BYTES_MAX || chunk.length >= MAILBOX_KEY_CAP;
        if (chunk.length && full) {
            chunks.push(chunk);
            chunk = [];
            bytes = 0;
        }
        chunk.push(key);
        bytes += cost;
    }
    if (chunk.length) chunks.push(chunk);
    return chunks;
};

/**
 * Read one namespace's slice and merge it into the cache. A failed chunk leaves its collections uncached
 * rather than cached empty — only "there are no mailboxes here" may hide a block.
 * @returns {Promise<boolean>} whether anything actually changed
 */
const fetchMailboxes = async (ns, keys) => {
    // Stamped before the request and left stamped on failure: a down endpoint costs one request per TTL,
    // not one per render pass.
    const stamp = Date.now();
    for (const key of keys) {
        const id = mailboxCacheKey(ns, key);
        mailboxFetchedAt.set(id, stamp);
        mailboxInFlight.add(id);
    }

    let changed = false;
    try {
        for (const chunk of mailboxKeyChunks(keys)) {
            /** @type {{ mailboxes?: Mailbox[], truncatedCollections?: string[] }} */
            let data;
            try {
                const res = await fetch(
                    `/dashboard/mailboxes?namespace=${encodeURIComponent(ns)}` +
                        `&collectionKeys=${encodeURIComponent(chunk.join(','))}`,
                );
                if (!res.ok) continue;
                data = await res.json();
            } catch {
                continue;
            }

            /** @type {Map<string, Mailbox[]>} */
            const byKey = new Map(chunk.map((k) => [k, []]));
            for (const mbx of data.mailboxes ?? []) {
                if (mbx.collectionKey) byKey.get(mbx.collectionKey)?.push(mbx);
            }
            const truncated = new Set(data.truncatedCollections ?? []);

            for (const [key, mailboxes] of byKey) {
                const id = mailboxCacheKey(ns, key);
                const next = { mailboxes, truncated: truncated.has(key) };
                if (JSON.stringify(mailboxCache.get(id) ?? NO_MAILBOXES) !== JSON.stringify(next)) {
                    changed = true;
                }
                if (mailboxes.length) mailboxSeen = true;
                mailboxCache.set(id, next);
            }
        }
    } finally {
        for (const key of keys) mailboxInFlight.delete(mailboxCacheKey(ns, key));
    }
    return changed;
};

/** Issue the pending wants, one namespace at a time, and re-render only if something moved. */
const flushMailboxWants = async () => {
    const wanted = [...mailboxWanted];
    mailboxWanted.clear();
    if (!wanted.length) return;
    const changed = await Promise.all(wanted.map(([ns, keys]) => fetchMailboxes(ns, [...keys])));
    if (changed.some(Boolean)) for (const fn of rerenderHooks) fn();
};

/**
 * Queue a collection for reading. Skipping fresh and in-flight collections is what stops the re-render
 * this can trigger from feeding itself.
 */
const wantMailboxes = (ns, key, hinted) => {
    const id = mailboxCacheKey(ns, key);
    if (mailboxInFlight.has(id)) return;
    if (Date.now() - (mailboxFetchedAt.get(id) ?? 0) < mailboxTtl(id, hinted)) return;
    let keys = mailboxWanted.get(ns);
    if (!keys) mailboxWanted.set(ns, (keys = new Set()));
    keys.add(key);
};

const trimMailboxCache = () => {
    if (mailboxCache.size <= MAILBOX_CACHE_MAX) return;
    for (const id of [...mailboxCache.keys()]) {
        if (mailboxOnScreen.has(id) || mailboxInFlight.has(id)) continue;
        mailboxCache.delete(id);
        mailboxFetchedAt.delete(id);
    }
};

/**
 * Close a render pass: its groups become the on-screen set and their wants go out as one batch.
 * Scheduled from `buildGroupEl`, so the timer firing means "the pass is over".
 */
const endMailboxPass = () => {
    mailboxOnScreen = mailboxThisPass;
    mailboxThisPass = new Map();
    trimMailboxCache();
    for (const { ns, key, hinted } of mailboxOnScreen.values()) wantMailboxes(ns, key, hinted);
    if (mailboxSeen) startMailboxPoll();
    void flushMailboxWants();
};

const noteMailboxGroup = (ns, key, hinted) => {
    if (hinted) mailboxSeen = true;
    const id = mailboxCacheKey(ns, key);
    const already = mailboxThisPass.get(id);
    mailboxThisPass.set(id, { ns, key, hinted: hinted || !!already?.hinted });
    clearTimeout(_mailboxPassTimer);
    _mailboxPassTimer = window.setTimeout(endMailboxPass, 0);
};

/**
 * Start polling once the dashboard has any evidence of mailboxes: an exchange can progress without any
 * workflow changing, so no ordinary render pass would come. A deployment that never minted a mailbox
 * never starts the timer.
 */
const startMailboxPoll = () => {
    if (_mailboxPoll) return;
    _mailboxPoll = window.setInterval(() => {
        for (const { ns, key, hinted } of mailboxOnScreen.values()) wantMailboxes(ns, key, hinted);
        void flushMailboxWants();
    }, MAILBOX_POLL_MS);
};

/** The four position states in words, for the tooltip that has room to spell them out. */
const POSITION_MEANING = {
    delivered: 'a message stands here, unpaired — no receiver has been enqueued for it',
    paired: 'a receiver holds this position and its message was standing at it',
    waiting: 'a receiver is parked here and its message has not arrived',
    closed: 'a receiver was released with the closing signal — no message ever came',
};

/**
 * One position as a chip; a chip whose receiver is rendered in this spine reveals it on click.
 * @param {MailboxPosition} pos @param {Set<string>} spineIds
 */
const mailboxPositionHTML = (pos, spineIds) => {
    const receiver = pos.receiverWorkflowId;
    const linked = !!receiver && spineIds.has(receiver);
    const facts = [`position ${pos.position}`, POSITION_MEANING[pos.state] ?? pos.state];
    if (pos.deliveryKey) facts.push(`message ${pos.deliveryKey}`);
    if (pos.acceptedAt) facts.push(`accepted ${fmtTime(pos.acceptedAt)}`);
    if (receiver) facts.push(`receiver ${receiver}`);
    if (pos.heldAt) facts.push(`parked ${fmtTime(pos.heldAt)}`);
    if (pos.releasedAt) facts.push(`released ${fmtTime(pos.releasedAt)}`);
    if (pos.claimedAt) facts.push(`claimed ${fmtTime(pos.claimedAt)}`);
    if (pos.parkedForSeconds !== undefined) {
        facts.push(`parked for ${formatSpan(pos.parkedForSeconds)}`);
    }
    facts.push(
        linked
            ? 'click to reveal the receive workflow'
            : receiver
              ? 'its receive workflow is outside this window — load the full history'
              : 'no receiver has been enqueued for this position',
    );

    // Parked has no server-sent duration while the wait runs, so the chip counts up from the stamp.
    const elapsed =
        pos.state === 'waiting' && pos.heldAt
            ? ` <span class="mbx-parked" data-parked-since="${escAttr(pos.heldAt)}"></span>`
            : pos.parkedForSeconds !== undefined
              ? ` <span class="mbx-parked">${esc(formatSpan(pos.parkedForSeconds))}</span>`
              : '';
    const cls = `mbx-pos ${escAttr(pos.state)}${linked ? ' mbx-linked' : ''}`;
    const click = linked ? ` onclick="mailboxRevealReceiver(event,'${escJsArg(receiver)}')"` : '';
    return `<span class="${cls}"${click} title="${escAttr(facts.join(' · '))}">${pos.position}${elapsed}</span>`;
};

const mailboxBlockHTML = (ns, key, mbx, spineIds) => {
    const open = mbx.status === 'Open';
    const cls = `mbx-block${open ? ' mbx-open' : ''}`;
    const data = open ? ` data-mbx-ns="${escAttr(ns)}" data-mbx-key="${escAttr(key)}"` : '';
    let html = `<div class="${cls}"${data}>`;
    html += '<div class="mbx-header">';
    html += `<span class="mbx-tag" title="Mailbox ${escAttr(mbx.id)} — the reply address this exchange handed out, minted ${escAttr(fmtTime(mbx.createdAt))}">&#9993; ${esc(abbrevGuids(mbx.id) ?? '')}</span>`;
    html += `<span class="mbx-key" title="Mint idempotency key — the step that created the mailbox">${esc(abbrevGuids(mbx.idempotencyKey) ?? '')}</span>`;
    const state = open ? 'open' : `closed · ${String(mbx.disposedReason ?? '').toLowerCase()}`;
    const stateTitle = open
        ? 'Accepting deliveries until its deadline'
        : mbx.disposedReason === 'Deadline'
          ? 'Closed by the deadline sweep: every parked receiver was released with the closing signal'
          : 'Closed on request by the app concluding the exchange';
    html += `<span class="mbx-status ${open ? 'open' : 'disposed'}" title="${escAttr(stateTitle)}">${esc(state)}</span>`;
    html += '<span class="header-spacer"></span>';
    // idx and seq are the API's and the schema's own words; not prettified.
    html += `<span class="mbx-counts" title="Deliveries log: ${mbx.nextIdx} position(s) taken. Receivers log: ${mbx.nextSeq} position(s) assigned.">idx ${mbx.nextIdx} · seq ${mbx.nextSeq}</span>`;
    if (mbx.unpairedDeliveries > 0) {
        html += `<span class="mbx-unpaired" title="Accepted messages no receiver was ever enqueued for. They stay readable until retention purges the mailbox.">${mbx.unpairedDeliveries} unpaired</span>`;
    }
    // The deadline shows on a closed mailbox too: timed out and concluded read differently.
    html += open
        ? `<span class="mbx-deadline" data-deadline="${escAttr(mbx.deadline)}" title="The one bound on this exchange: the sweep closes the mailbox within one cadence of its deadline."></span>`
        : `<span class="mbx-deadline">closed ${esc(fmtAgo(mbx.disposedAt))}</span>`;
    html += `<span class="mbx-deadline-at" title="Deadline">deadline</span>`;
    html += `<span class="timestamp" data-iso="${escAttr(mbx.deadline)}">${esc(fmtTime(mbx.deadline) ?? '')}</span>`;
    html += '</div>';

    html += '<div class="mbx-positions">';
    html += mbx.positions.length
        ? mbx.positions.map((pos) => mailboxPositionHTML(pos, spineIds)).join('')
        : `<span class="mbx-empty">no messages and no receivers yet</span>`;
    html += '</div></div>';
    return html;
};

/**
 * A collection's mailboxes, oldest-minted first to read in the spine's direction; nothing at all for a
 * collection with no mailbox.
 */
const mailboxBlocksHTML = (ns, key, spineIds) => {
    const entry = mailboxCache.get(mailboxCacheKey(ns, key));
    if (!entry?.mailboxes.length) return '';
    let html = '<div class="mbx-list">';
    if (entry.truncated) {
        html += `<div class="chain-truncated" title="This collection holds more mailboxes than the dashboard reads per collection; only the most recently minted are shown">&#8943; older mailboxes not shown</div>`;
    }
    for (const mbx of [...entry.mailboxes].reverse()) {
        html += mailboxBlockHTML(ns, key, mbx, spineIds);
    }
    return `${html}</div>`;
};

window.mailboxRevealReceiver = (e, wfId) => {
    e.stopPropagation();
    revealChainRow(wfId);
};

const TERMINAL_STATUSES = new Set([
    'Completed',
    'Failed',
    'Canceled',
    'Abandoned',
    'DependencyFailed',
]);

/**
 * Aggregate status for a group header: an in-flight member wins (the story is still
 * running), then the worst terminal outcome, then Completed.
 * @param {Workflow[]} members @returns {string}
 */
const aggregateStatus = (members) => {
    const statuses = new Set(members.map((m) => m.status));
    for (const s of ['Processing', 'Requeued', 'Waiting', 'Held', 'Enqueued'])
        if (statuses.has(s)) return s;
    for (const s of ['Failed', 'DependencyFailed', 'Canceled', 'Abandoned'])
        if (statuses.has(s)) return s;
    return 'Completed';
};

/** Wall-clock span of the group: first enqueue → last write. @param {Workflow[]} members */
const spanHTML = (members) => {
    const starts = members.map((m) => new Date(m.createdAt).getTime());
    const ends = members.map((m) =>
        new Date(m.removedAt || m.steps.at(-1)?.updatedAt || m.updatedAt || m.createdAt).getTime(),
    );
    const span = (Math.max(...ends) - Math.min(...starts)) / 1000;
    if (!Number.isFinite(span) || span < 0) return '';
    const label = span < 1 ? `${(span * 1000).toFixed(0)}ms` : formatElapsed(span);
    return `<span class="chain-time" title="First enqueue → last update">${esc(label)}</span>`;
};

/**
 * @param {number} count - members this surface contributed
 * @param {number} total - rows rendered (history graph can exceed the members)
 * @param {string} countNoun - 'workflows' for exhaustive surfaces, 'matching' for filtered ones
 * @returns {string}
 */
const countLabel = (count, total, countNoun) => {
    const noun = countNoun === 'workflows' && count === 1 ? 'workflow' : countNoun;
    return total > count ? `${count} ${noun} of ${total}` : `${count} ${noun}`;
};

/**
 * @param {string} key - collectionKey
 * @param {Workflow[]} members - createdAt-ordered group members
 * @param {{ total: number, hasHistory: boolean, countNoun: string }} opts
 * @returns {string}
 */
const groupHeaderHTML = (key, members, opts) => {
    const head = members.find((m) => m.isHead !== false) ?? members[0];
    let html = '<div class="chain-group-header">';
    html += buildLabelsHTML(head, true);
    html += '<span class="header-spacer"></span>';
    html += `<span class="chain-count">${countLabel(members.length, opts.total, opts.countNoun)}</span>`;
    html += spanHTML(members);
    const agg = aggregateStatus(members);
    html += `<span class="status-pill ${escAttr(agg)}" style="animation:none">${esc(agg)}</span>`;
    html += collectionButtonHTML(head, true);
    html += opts.hasHistory
        ? `<span class="chain-history-loaded" title="Showing the full workflow graph for this collection">full history</span>`
        : `<a class="open-btn chain-history-btn" onclick="loadChainHistory(event,'${escJsArg(key)}','${escJsArg(head.databaseId)}','${escJsArg(head.namespace)}')" title="Load the full workflow graph for this collection (beyond the current window)">&#10227; history</a>`;
    html += '</div>';
    return html;
};

/**
 * Build one collection group: header + spine. Uses the cached full graph when loaded
 * (auto-refreshing it when new members have appeared since the fetch), otherwise the
 * creation-order heuristic over the given members.
 * @param {string} key
 * @param {Workflow[]} members
 * @param {{ countNoun?: string }} [opts] - countNoun: 'workflows' (default) when members are
 *   exhaustive for the surface, 'matching' when they are a filtered subset (query results)
 * @returns {HTMLElement}
 */
export const buildGroupEl = (key, members, opts) => {
    const countNoun = opts?.countNoun ?? 'workflows';
    members.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
    // Chains surfaces group by collection key alone, so one group can hold two namespaces' workflows —
    // each is asked for its own mailboxes.
    const namespaces = [...new Set(members.map((m) => m.namespace))];
    const hinted = members.some((m) => m.mailboxId);
    for (const ns of namespaces) noteMailboxGroup(ns, key, hinted);

    const hist = historyCache.get(key);
    let items;
    let total = members.length;
    if (hist) {
        const merged = new Map(hist.nodes.map((n) => [n.databaseId, n]));
        let missing = false;
        for (const m of members) {
            if (!merged.has(m.databaseId)) {
                missing = true;
                merged.set(m.databaseId, m);
            }
        }
        total = merged.size;
        items = buildSpineFromEdges([...merged.values()], hist.edges);
        // New members mean new edges the cache doesn't know about — refetch in the background.
        if (missing && !historyRefreshing.has(key)) {
            historyRefreshing.add(key);
            const head = /** @type {Workflow} */ (members.at(-1));
            window
                .loadChainHistory(null, key, head.databaseId, head.namespace)
                .finally(() => historyRefreshing.delete(key));
        }
    } else {
        items = buildSpineByCreation(members);
    }

    const el = document.createElement('div');
    el.className = 'chain-group';
    el.dataset.collectionkey = key.toLowerCase();
    el.dataset.namespace = members[0].namespace.toLowerCase();
    el.dataset.filter = members.map(buildFilterText).join(' ');
    el.dataset.status = [...new Set(members.flatMap((m) => buildStatusTags(m).split(' ')))].join(
        ' ',
    );
    const labels = new Set();
    for (const m of members) {
        for (const [k, v] of Object.entries(m.labels ?? {})) labels.add(`${k}:${v}`.toLowerCase());
    }
    if (labels.size) el.dataset.labels = [...labels].join(',');
    // The rows this spine actually rendered decide which chips are links.
    const spineIds = new Set(items.map((i) => i.wf.databaseId));
    el.innerHTML =
        groupHeaderHTML(key, members, { total, hasHistory: !!hist, countNoun }) +
        renderChainList(items, '', { truncated: hist?.truncated }) +
        namespaces.map((ns) => mailboxBlocksHTML(ns, key, spineIds)).join('');
    for (const m of members) {
        workflowData[m.databaseId] = state.previousWorkflows[m.databaseId] ?? m;
    }
    return el;
};

/**
 * Fetch the full connected graph for a collection and re-render every chains surface.
 * @param {Event | null} e @param {string} key @param {string} wfId @param {string} ns
 */
window.loadChainHistory = async (e, key, wfId, ns) => {
    e?.stopPropagation();
    try {
        const res = await fetch(
            `/dashboard/graph?wf=${encodeURIComponent(wfId)}&ns=${encodeURIComponent(ns)}`,
        );
        if (!res.ok) return;
        const data = await res.json();
        historyCache.set(key, {
            nodes: data.workflows ?? [],
            edges: data.edges ?? [],
            truncated: !!data.truncated,
        });
    } catch {
        return;
    }
    for (const fn of rerenderHooks) fn();
};

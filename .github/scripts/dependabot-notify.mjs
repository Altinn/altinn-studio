import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

/**
 * Routes Dependabot alerts to per-team Slack webhooks.
 *
 * Ownership comes from CODEOWNERS: an alert's `dependency.manifest_path` is matched
 * against the same rules that drive review requests, so there is one source of truth.
 */

const CODEOWNERS_FILE = '.github/CODEOWNERS';
const STATE_FILE = 'dependabot-notify-state.json';
// Overridable so a local dry-run can widen the window without editing this file.
const LOOKBACK_HOURS = Number(process.env.LOOKBACK_HOURS ?? 4);

const MAX_ALERTS_PER_MESSAGE = 45;
const FALLBACK_KEY = 'fallback';

const EMOJI = {
  critical: ':red_circle:',
  high: ':large_orange_circle:',
  medium: ':large_yellow_circle:',
};

export function parseCodeowners(text) {
  return text
    .split('\n')
    .map((line) => line.replace(/#.*$/, '').trim())
    .filter(Boolean)
    .map((line) => line.split(/\s+/))
    .filter(([, ...owners]) => owners.length > 0)
    .map(([pattern, ...owners]) => ({ owners, regex: patternToRegExp(pattern) }));
}

function patternToRegExp(pattern) {
  const rest = pattern.replace(/^\//, '');
  const anchored = pattern.startsWith('/') || rest.includes('/');

  let body = '';
  for (let i = 0; i < rest.length; i += 1) {
    if (rest[i] === '*' && rest[i + 1] === '*' && rest[i + 2] === '/') {
      // `a/**/b` must also match `a/b`, so the segment group is optional.
      body += '(?:.*/)?';
      i += 2;
    } else if (rest[i] === '*') {
      body += '[^/]*';
    } else {
      body += rest[i].replace(/[.+^${}()|[\]\\?]/g, '\\$&');
    }
  }

  return new RegExp(`${anchored ? '^' : '^(?:.*/)?'}${body}$`);
}

/** CODEOWNERS semantics: the LAST matching rule wins, not the first. */
export function matchOwners(rules, filePath) {
  return rules.reduce((owners, rule) => (rule.regex.test(filePath) ? rule.owners : owners), []);
}

/** Alert numbers are per repository, so the dedup key must include the repo. */
export function alertKey(alert) {
  return `${alert.repo}#${alert.number}`;
}

/**
 * @returns {Map<string, object[]>} webhook key -> alerts. Webhook keys mirror
 * CODEOWNERS handles (`@altinn/team-x` -> `altinn/team-x`) so there is no second
 * naming scheme to keep in sync.
 */
export function groupByWebhookKey({ alerts, rules, repoOwners }) {
  const groups = new Map();

  for (const alert of alerts) {
    // A repo listed with an owner routes everything there; otherwise CODEOWNERS decides.
    const owners = repoOwners[alert.repo]
      ? [repoOwners[alert.repo]]
      : matchOwners(rules, alert.dependency?.manifest_path ?? '');

    const keys = owners.length
      ? owners.map((owner) => owner.replace(/^@/, '').toLowerCase())
      : [FALLBACK_KEY];

    for (const key of keys) {
      groups.set(key, [...(groups.get(key) ?? []), alert]);
    }
  }

  return groups;
}

function escape(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function buildSlackPayload(webhookKey, alerts) {
  const title =
    webhookKey === FALLBACK_KEY
      ? `${alerts.length} Dependabot alert(s) with no CODEOWNERS owner`
      : `${alerts.length} new Dependabot alert(s)`;

  const blocks = [{ type: 'header', text: { type: 'plain_text', text: title } }];

  for (const alert of alerts.slice(0, MAX_ALERTS_PER_MESSAGE)) {
    const severity = alert.security_advisory?.severity ?? 'unknown';
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text:
          `${EMOJI[severity] ?? ':white_circle:'} *${severity.toUpperCase()}* — ` +
          `<${alert.html_url}|${escape(alert.security_advisory?.summary ?? 'Unknown advisory')}>\n` +
          `*${escape(alert.repo)}* · \`${escape(alert.dependency?.package?.name ?? 'unknown')}\` · ` +
          `\`${escape(alert.dependency?.manifest_path ?? 'unknown manifest')}\``,
      },
    });
  }

  if (alerts.length > MAX_ALERTS_PER_MESSAGE) {
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `…and ${alerts.length - MAX_ALERTS_PER_MESSAGE} more not shown here.`,
        },
      ],
    });
  }

  return { blocks };
}

function readJson(file, fallback) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback;
}

/**
 * This endpoint paginates by cursor, not page number, so the only way forward is
 * the URL GitHub hands back in the Link header.
 */
export function parseNextLink(linkHeader) {
  return linkHeader?.match(/<([^>]+)>;\s*rel="next"/)?.[1] ?? null;
}

/** @returns {Promise<object[]>} every open medium+ alert, tagged with its repo */
async function fetchAlerts(repo, token) {
  const alerts = [];
  let url =
    `https://api.github.com/repos/${repo}/dependabot/alerts` +
    '?state=open&severity=medium,high,critical&per_page=100';

  while (url) {
    const response = await fetch(url, {
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/vnd.github+json',
        'x-github-api-version': '2022-11-28',
      },
    });

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status} ${await response.text().then((t) => t.slice(0, 120))}`,
      );
    }

    alerts.push(...(await response.json()).map((alert) => ({ ...alert, repo })));
    url = parseNextLink(response.headers.get('link'));
  }

  return alerts;
}

async function main() {
  const webhooks = JSON.parse(process.env.SLACK_WEBHOOKS ?? '{}');
  // Secret masking covers the raw JSON blob, not the URLs we pull out of it.
  for (const url of Object.values(webhooks)) {
    process.stdout.write(`::add-mask::${url}\n`);
  }

  const repoOwners = JSON.parse(process.env.REPOS ?? '{}');
  // Without these, the run would poll nothing and report a healthy-looking zero.
  if (!process.env.GH_TOKEN) {
    throw new Error('GH_TOKEN is not set');
  }
  if (Object.keys(repoOwners).length === 0) {
    throw new Error('REPOS is empty — no repositories to poll');
  }

  const alerts = [];
  for (const repo of Object.keys(repoOwners)) {
    try {
      alerts.push(...(await fetchAlerts(repo, process.env.GH_TOKEN)));
    } catch (error) {
      // A repo with Dependabot disabled must not fail the whole run.
      process.stdout.write(`::warning::could not fetch alerts for ${repo}: ${error.message}\n`);
    }
  }

  const since = new Date(Date.now() - LOOKBACK_HOURS * 3600_000).toISOString();
  const seen = new Set(readJson(STATE_FILE, []));

  // The lookback window overlaps the schedule so a delayed run drops nothing;
  // `seen` stops that overlap from sending the same alert twice.
  const fresh = alerts.filter((alert) => !seen.has(alertKey(alert)) && alert.created_at > since);
  process.stdout.write(
    `::notice::${alerts.length} open alert(s), ${fresh.length} new since ${since}\n`,
  );

  const groups = groupByWebhookKey({
    alerts: fresh,
    rules: parseCodeowners(fs.readFileSync(CODEOWNERS_FILE, 'utf8')),
    repoOwners,
  });

  for (const [key, alerts] of groups) {
    const url = webhooks[key] ?? webhooks[FALLBACK_KEY];
    if (!url) {
      process.stdout.write(
        `::warning::no webhook for '${key}', ${alerts.length} alert(s) dropped\n`,
      );
      continue;
    }

    if (process.env.DRY_RUN === 'true') {
      process.stdout.write(`[dry-run] ${key}: ${alerts.length} alert(s)\n`);
    } else {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildSlackPayload(key, alerts)),
      });
      // One bad webhook must not stop the remaining teams from being told.
      if (!response.ok) {
        process.stdout.write(`::warning::${key} returned HTTP ${response.status}\n`);
        continue;
      }
      process.stdout.write(`sent ${alerts.length} alert(s) to '${key}'\n`);
    }

    alerts.forEach((alert) => seen.add(alertKey(alert)));
  }

  fs.writeFileSync(STATE_FILE, JSON.stringify([...seen]));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`${error.stack}\n`);
    process.exit(1);
  });
}

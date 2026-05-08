// Posts the synthesised review as a single PR review with inline comments.
// Invoked from the workflow via actions/github-script.
// Required env: PR_NUMBER, HEAD_SHA, FINAL_JSON_PATH

const fs = require('node:fs');

const SEVERITY_BADGE = {
  critical: '🔴 **Critical**',
  high: '🟠 **High**',
  medium: '🟡 **Medium**',
  low: '🔵 **Low**',
};

const SEVERITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 };

module.exports = async ({ github, context, core }) => {
  const prNumber = Number(process.env.PR_NUMBER);
  const headSha = process.env.HEAD_SHA;
  const finalJsonPath = process.env.FINAL_JSON_PATH;

  if (!prNumber || !headSha || !finalJsonPath) {
    core.setFailed('PR_NUMBER, HEAD_SHA and FINAL_JSON_PATH must be set');
    return;
  }

  const raw = fs.readFileSync(finalJsonPath, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    core.setFailed(`final.json is not valid JSON: ${error.message}`);
    return;
  }

  const issues = Array.isArray(parsed?.issues) ? parsed.issues : [];
  const reportableIssues = issues.filter((issue) => issue && issue.severity !== 'negligible');

  if (reportableIssues.length === 0) {
    await github.rest.pulls.createReview({
      owner: context.repo.owner,
      repo: context.repo.repo,
      pull_number: prNumber,
      commit_id: headSha,
      event: 'COMMENT',
      body: '🤖 OpenCode dual reviewer: no significant issues found.',
    });
    return;
  }

  const filesInDiff = await listFilesWithChangedLines({ github, context, prNumber });

  const acceptedComments = [];
  const skippedIssues = [];

  for (const issue of reportableIssues) {
    const changedLines = filesInDiff.get(issue.file);
    if (!changedLines || !changedLines.has(issue.line)) {
      skippedIssues.push(issue);
      continue;
    }
    acceptedComments.push({
      path: issue.file,
      line: issue.line,
      side: 'RIGHT',
      body: formatComment(issue),
      _severity: issue.severity,
    });
  }

  acceptedComments.sort(
    (a, b) => (SEVERITY_RANK[a._severity] ?? 99) - (SEVERITY_RANK[b._severity] ?? 99),
  );
  acceptedComments.forEach((comment) => delete comment._severity);

  const summary = buildSummary(reportableIssues, skippedIssues);

  await github.rest.pulls.createReview({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: prNumber,
    commit_id: headSha,
    event: 'COMMENT',
    body: summary,
    comments: acceptedComments,
  });
};

function formatComment(issue) {
  const badge = SEVERITY_BADGE[issue.severity] ?? `**${issue.severity}**`;
  const parts = [`${badge} — ${issue.title}`, '', issue.body];
  if (issue.suggestion) {
    parts.push('', '```suggestion', issue.suggestion, '```');
  }
  return parts.join('\n');
}

function buildSummary(reportable, skipped) {
  const counts = reportable.reduce((acc, issue) => {
    acc[issue.severity] = (acc[issue.severity] ?? 0) + 1;
    return acc;
  }, {});
  const order = ['critical', 'high', 'medium', 'low'];
  const breakdown = order
    .filter((severity) => counts[severity])
    .map((severity) => `${SEVERITY_BADGE[severity]}: ${counts[severity]}`)
    .join(' · ');

  const lines = [
    '🤖 **OpenCode dual reviewer** (Claude + OpenAI via Azure Foundry, synthesised)',
    '',
    breakdown || 'No issues above `negligible`.',
  ];
  if (skipped.length > 0) {
    lines.push(
      '',
      `_${skipped.length} finding(s) referenced lines outside the PR diff and were dropped._`,
    );
  }
  return lines.join('\n');
}

async function listFilesWithChangedLines({ github, context, prNumber }) {
  const filesInDiff = new Map();
  const iterator = github.paginate.iterator(github.rest.pulls.listFiles, {
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: prNumber,
    per_page: 100,
  });
  for await (const { data } of iterator) {
    for (const file of data) {
      if (!file.patch) continue;
      filesInDiff.set(file.filename, parseAddedLines(file.patch));
    }
  }
  return filesInDiff;
}

function parseAddedLines(patch) {
  const addedLines = new Set();
  let newLine = 0;
  for (const rawLine of patch.split('\n')) {
    const hunkHeader = rawLine.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunkHeader) {
      newLine = Number(hunkHeader[1]);
      continue;
    }
    if (rawLine.startsWith('+') && !rawLine.startsWith('+++')) {
      addedLines.add(newLine);
      newLine += 1;
    } else if (!rawLine.startsWith('-') && !rawLine.startsWith('\\')) {
      newLine += 1;
    }
  }
  return addedLines;
}

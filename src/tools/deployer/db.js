'use strict';

const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = path.join(__dirname, 'deployer.db');

function workflowStateKey(workflow) {
  return `newest_run_id:${workflow}`;
}

function getWorkflowStopAtRunId(stmts, workflow) {
  const state = stmts.getState.get(workflowStateKey(workflow));
  const parsed = state ? parseInt(state.value, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function setWorkflowStopAtRunId(stmts, workflow, runId) {
  stmts.setState.run(workflowStateKey(workflow), String(runId));
}

function initDb(dbPath = DB_PATH) {
  const db = new DatabaseSync(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      job_id INTEGER PRIMARY KEY,
      run_id INTEGER NOT NULL,
      workflow TEXT NOT NULL,
      env TEXT NOT NULL,
      sha TEXT NOT NULL,
      full_sha TEXT NOT NULL,
      title TEXT NOT NULL,
      run_url TEXT NOT NULL,
      job_status TEXT NOT NULL,
      job_conclusion TEXT,
      run_created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      can_approve INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_jobs_workflow_env ON jobs (workflow, env);
    CREATE INDEX IF NOT EXISTS idx_jobs_run_id ON jobs (run_id);

    CREATE TABLE IF NOT EXISTS sync_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  return prepareStatements(db);
}

function quoteSqlStrings(values) {
  return values.map((value) => `'${value}'`).join(', ');
}

function latestPendingRunsQuery(statuses) {
  const statusSql = quoteSqlStrings(statuses);
  return `
    SELECT DISTINCT run_id FROM (
      SELECT j.run_id, j.job_status
      FROM jobs j
      WHERE j.run_id = (
        SELECT MAX(j2.run_id)
        FROM jobs j2
        WHERE j2.workflow = j.workflow
          AND j2.env = j.env
          AND j2.job_status = 'completed'
          AND j2.job_conclusion = 'success'
      )
      UNION ALL
      SELECT j.run_id, j.job_status
      FROM jobs j
      WHERE j.run_id = (
        SELECT MAX(j2.run_id)
        FROM jobs j2
        WHERE j2.workflow = j.workflow
          AND j2.env = j.env
          AND j2.job_status IN (${statusSql})
      )
    ) ui_rows
    WHERE job_status IN (${statusSql})
  `;
}

function prepareStatements(db) {
  return {
    upsertJob: db.prepare(`
      INSERT INTO jobs (job_id, run_id, workflow, env, sha, full_sha, title, run_url, job_status, job_conclusion, run_created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(job_id) DO UPDATE SET
        run_id = excluded.run_id,
        workflow = excluded.workflow,
        env = excluded.env,
        sha = excluded.sha,
        full_sha = excluded.full_sha,
        title = excluded.title,
        run_url = excluded.run_url,
        job_status = excluded.job_status,
        job_conclusion = excluded.job_conclusion,
        run_created_at = excluded.run_created_at,
        updated_at = excluded.updated_at
      WHERE excluded.updated_at >= jobs.updated_at
    `),
    getState: db.prepare('SELECT value FROM sync_state WHERE key = ?'),
    setState: db.prepare(`
      INSERT INTO sync_state (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `),
    getCurrent: db.prepare(`
      SELECT sha, full_sha, title, run_url, run_id, job_status, job_conclusion, updated_at
      FROM jobs
      WHERE workflow = ? AND env = ? AND job_status = 'completed' AND job_conclusion = 'success'
      ORDER BY run_id DESC LIMIT 1
    `),
    getNext: db.prepare(`
      SELECT sha, full_sha, title, run_url, run_id, job_status, job_conclusion, updated_at, can_approve
      FROM jobs
      WHERE workflow = ? AND env = ?
        AND (
          job_status IN ('queued', 'waiting', 'in_progress')
          OR (job_status = 'completed' AND COALESCE(job_conclusion, '') != 'success')
        )
        AND run_id > COALESCE(
          (SELECT MAX(run_id) FROM jobs
           WHERE workflow = ? AND env = ? AND job_status = 'completed' AND job_conclusion = 'success'),
          0
        )
      ORDER BY run_id DESC, updated_at DESC, job_id DESC LIMIT 1
    `),
    getPendingJobs: db.prepare(latestPendingRunsQuery(['queued', 'waiting', 'in_progress'])),
    // Like getPendingJobs but excludes 'waiting' — for frequent polling where waiting jobs
    // won't change without human intervention.
    getActiveJobs: db.prepare(latestPendingRunsQuery(['queued', 'in_progress'])),
    // Waiting jobs whose can_approve has not yet been fetched from GH pending_deployments.
    // Used to make exactly one API call per newly-seen waiting run.
    getWaitingNeedingCanApprove: db.prepare(`
      SELECT DISTINCT run_id, workflow, env FROM jobs
      WHERE job_status = 'waiting' AND can_approve IS NULL
    `),
    setCanApprove: db.prepare(`
      UPDATE jobs SET can_approve = ?
      WHERE run_id = ? AND env = ? AND job_status = 'waiting'
    `),
    getJobs: db.prepare(`
      SELECT env, job_status, job_conclusion
      FROM jobs
      WHERE run_id = ? AND workflow = ?
    `),
    getRunContext: db.prepare(`
      SELECT run_id, workflow, full_sha, title, run_url, run_created_at, updated_at
      FROM jobs
      WHERE run_id = ?
      ORDER BY updated_at DESC, job_id DESC
      LIMIT 1
    `),
  };
}

module.exports = {
  DB_PATH,
  initDb,
  getWorkflowStopAtRunId,
  setWorkflowStopAtRunId,
};

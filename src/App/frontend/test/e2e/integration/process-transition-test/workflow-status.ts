import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

/**
 * E2E for the live workflow-status state machine (ADR 2026-07-08), driving the REAL workflow engine
 * via the ttd/process-transition-test app instead of intercept stubbing.
 *
 * The app is Task_1 (data) -> Task_2 (data) -> EndEvent. Task_1 has a form of "levers"
 * (delayMs / failCount / failKind / phase) that two app hooks read to control the Task_1 -> Task_2
 * transition:
 *   - phase "taskEnding": an IOnTaskEndingHandler delays/fails PRE-commit (committed=Task_1), so the
 *     engine surfaces `processing` (delay / retryable) or `failed` (permanent) on the committed Task_1.
 *   - phase "postCommit": a custom IEventsClient delays/fails POST-commit inside MovedToAltinnEvent
 *     (committed=Task_2 already), so `processing` is observable on the committed Task_2. Post-commit
 *     failures are retryable-only (MovedToAltinnEvent wraps throws as retryable), so failKind is not
 *     honoured there.
 *
 * UI strings (app-libs nb.ts, keys process_workflow.*):
 *   processing  = "Går videre til neste steg …" (deliberately never names the target task)
 *   failed      = heading "Noe gikk galt" + contact-support blurb + safe details expander
 *                 ("Vis detaljer om feilen"); deliberately NO Retry affordance — the engine already
 *                 exhausted its retry budget, so recovery is ops-driven (POST process/resume) and
 *                 the failed-state slow poll auto-converges the page.
 */

type Levers = {
  delayMs?: number;
  failCount?: number;
  failKind?: 'retryable' | 'permanent';
  phase?: 'taskEnding' | 'postCommit';
};

function fillLevers({ delayMs, failCount, failKind, phase }: Levers) {
  cy.get('#finishedLoading').should('exist');
  if (delayMs !== undefined) {
    cy.findByRole('textbox', { name: 'Forsinkelse (ms)' }).type(String(delayMs));
  }
  if (failCount !== undefined) {
    cy.findByRole('textbox', { name: 'Antall feil før suksess' }).type(String(failCount));
  }
  if (failKind !== undefined) {
    cy.findByRole('radiogroup', { name: 'Feiltype' }).findByRole('radio', { name: failKind }).click();
  }
  if (phase !== undefined) {
    cy.findByRole('radiogroup', { name: 'Fase' }).findByRole('radio', { name: phase }).click();
  }
  // The hooks read the levers from Storage, so they must be persisted before we advance the process.
  cy.waitUntilSaved();
}

// Captures the instance root (.../instance/{party}/{guid}) from the current URL so we can later visit a
// specific task's URL directly (e.g. to converge on the committed task after a reloaded session).
function captureInstanceRoot(): Cypress.Chainable<string> {
  return cy.url().then((url) => {
    const match = url.match(/^(.*\/instance\/[^/]+\/[^/]+)/);
    expect(match, `instance root in url ${url}`).to.not.equal(null);
    return match![1];
  });
}

// Clicks "Send inn" and reloads while the transition is still running server-side. We wait until the
// process/next request has actually left the browser (so the engine has the work enqueued) before
// reloading, so the reloaded read reliably observes the in-flight transition.
function submitAndReloadDuringTransition() {
  let requestIssued = false;
  // process/next is a PUT; wait until it has actually left the browser before reloading.
  cy.intercept('PUT', '**/process/next*', (req) => {
    requestIssued = true;
    req.continue();
  });
  cy.findByRole('button', { name: 'Send inn' }).click();
  cy.wrap(null).should(() => expect(requestIssued, 'process/next request issued').to.equal(true));
  cy.reload();
}

describe('Live workflow status (real engine)', () => {
  it('idle: no delay/fail advances straight to Task_2', () => {
    cy.startAppInstance(appFrontend.apps.processTransitionTest, { cyUser: 'manager' });
    cy.get('#finishedLoading').should('exist');
    cy.findByRole('heading', { name: /Task 1/ }).should('be.visible');

    // No levers set (phase unset) -> both hooks are no-ops -> the transition commits immediately.
    cy.findByRole('button', { name: 'Send inn' }).click();

    cy.findByRole('heading', { name: 'Task 2', timeout: 30000 }).should('be.visible');
    cy.get('#finishedLoading').should('exist');
    cy.findByRole('button', { name: 'Send inn' }).should('be.visible');
  });

  it('processing (pre-commit): reload during the delay shows the advancing UI, then converges on Task_2', () => {
    cy.startAppInstance(appFrontend.apps.processTransitionTest, { cyUser: 'manager' });
    captureInstanceRoot().as('instanceRoot');
    fillLevers({ delayMs: 8000, phase: 'taskEnding' });

    submitAndReloadDuringTransition();

    // Committed task is still Task_1 during the pre-commit delay, so the reloaded session renders the
    // live "advancing" state and the task's Send inn action is suppressed. (The workflow's labels carry
    // targetTask=Task_2 from enqueue time, but the advancing message deliberately never names it.)
    cy.contains('Går videre til', { timeout: 15000 }).should('be.visible');
    cy.findByRole('button', { name: 'Send inn' }).should('not.exist');
    cy.findByRole('heading', { name: 'Noe gikk galt' }).should('not.exist');

    // After the delay the transition commits to Task_2. This reloaded session is parked on the old
    // Task_1 url, so we converge by visiting the committed task directly (concurrent-session style).
    // The transition happens out-of-band in the engine with no signal on this abandoned page, so we
    // wait out the (known) delay before reading the committed task.
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(11000);
    cy.get<string>('@instanceRoot').then((root) => cy.visit(`${root}/Task_2`));
    cy.findByRole('heading', { name: 'Task 2', timeout: 30000 }).should('be.visible');
    cy.get('#finishedLoading').should('exist');
  });

  it('failed (pre-commit permanent): shows the error page; an ops resume auto-recovers the page', () => {
    cy.startAppInstance(appFrontend.apps.processTransitionTest, { cyUser: 'manager' });
    captureInstanceRoot().as('instanceRoot');
    fillLevers({ failCount: 1, failKind: 'permanent', phase: 'taskEnding' });

    cy.findByRole('button', { name: 'Send inn' }).click();

    // Attempt 1 fails permanently -> the engine stops (ResumeRequired) -> the failed error page:
    // generic message + contact support + a safe details expander. The engine already exhausted
    // its retry budget, so there is deliberately NO Retry affordance.
    cy.findByRole('heading', { name: 'Noe gikk galt', timeout: 30000 }).should('be.visible');
    cy.findByRole('button', { name: 'Send inn' }).should('not.exist');
    cy.findByRole('button', { name: 'Prøv igjen' }).should('not.exist');

    // The details expander exposes only safe structured facts (kind label + support reference).
    cy.findByRole('button', { name: 'Vis detaljer om feilen' }).click();
    cy.contains('Et behandlingssteg feilet').should('be.visible');
    cy.contains('Referanse').should('be.visible');

    // Recovery is ops-driven: resume via the API (as ops tooling would). Attempt 2 succeeds and
    // commits Task_2 out-of-band, and the failed-state slow poll (~10-12s) auto-recovers the page
    // without any user interaction or reload.
    cy.url().then((url) => {
      const match = url.match(/\/instance\/([^/]+)\/([^/#?]+)/);
      expect(match, `instance ids in url ${url}`).to.not.equal(null);
      const [, partyId, instanceGuid] = match!;
      const appBase = new URL(url).origin;
      cy.request(
        'POST',
        `${appBase}/ttd/${appFrontend.apps.processTransitionTest}/instances/${partyId}/${instanceGuid}/process/resume`,
      );
    });

    // The poll picks up the settled state on its own; the error page disappears without a reload.
    cy.findByRole('heading', { name: 'Noe gikk galt', timeout: 30000 }).should('not.exist');

    // This session is parked on the old Task_1 url; converge on the committed task directly.
    cy.get<string>('@instanceRoot').then((root) => cy.visit(`${root}/Task_2`));
    cy.findByRole('heading', { name: 'Task 2', timeout: 30000 }).should('be.visible');
    cy.get('#finishedLoading').should('exist');
  });

  it('retryable (pre-commit): engine auto-retries to success, no manual retry needed', () => {
    cy.startAppInstance(appFrontend.apps.processTransitionTest, { cyUser: 'manager' });
    captureInstanceRoot().as('instanceRoot');
    fillLevers({ delayMs: 3000, failCount: 1, failKind: 'retryable', phase: 'taskEnding' });

    submitAndReloadDuringTransition();

    // A retryable failure keeps the transition in `processing` (the engine auto-retries with backoff);
    // it is NOT the terminal failed state, so the failed error page never shows.
    cy.contains('Går videre til', { timeout: 15000 }).should('be.visible');
    cy.findByRole('heading', { name: 'Noe gikk galt' }).should('not.exist');

    // Attempt 2 (after the auto-retry + engine backoff) succeeds and commits Task_2 out-of-band.
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(15000);
    cy.get<string>('@instanceRoot').then((root) => cy.visit(`${root}/Task_2`));
    cy.findByRole('heading', { name: 'Task 2', timeout: 30000 }).should('be.visible');
    cy.get('#finishedLoading').should('exist');
  });

  it('processing (post-commit): observable on the committed Task_2, then settles to a normal Task_2', () => {
    cy.startAppInstance(appFrontend.apps.processTransitionTest, { cyUser: 'manager' });
    captureInstanceRoot().as('instanceRoot');
    fillLevers({ delayMs: 10000, phase: 'postCommit' });

    // The pre-commit hook is a no-op here, so the transition commits to Task_2 quickly; the post-commit
    // MovedToAltinnEvent then delays ~10s in the engine.
    cy.findByRole('button', { name: 'Send inn' }).click();

    // Give the pre-commit steps time to commit Task_2, then open the committed task in a fresh load
    // (concurrent-session style) while the post-commit step is still running.
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(3000);
    cy.get<string>('@instanceRoot').then((root) => cy.visit(`${root}/Task_2`));

    // Committed currentTask is already Task_2 (not idle/receipt), yet the post-commit step is still in
    // flight -> the advancing UI shows on the committed Task_2 and its Send inn is suppressed. This is
    // exactly what a legacy IProcessEnd (which runs on the process-END transition) could NOT surface.
    cy.contains('Går videre til', { timeout: 20000 }).should('be.visible');
    cy.findByRole('button', { name: 'Send inn' }).should('not.exist');

    // Once the post-commit step completes the status settles and Task_2 renders normally. The url
    // already matches the committed task, so the polling page converges on its own.
    cy.findByRole('heading', { name: 'Task 2', timeout: 30000 }).should('be.visible');
    cy.get('#finishedLoading').should('exist');
    cy.findByRole('button', { name: 'Send inn' }).should('be.visible');
  });
});

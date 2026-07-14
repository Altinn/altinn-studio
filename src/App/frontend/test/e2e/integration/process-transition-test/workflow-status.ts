import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

/**
 * E2E for the live workflow-status state machine (ADR 2026-07-08), driving the REAL workflow engine
 * via the ttd/process-transition-test app instead of intercept stubbing.
 *
 * The app is Task_1 (data) -> Task_2 (data) -> gateway -> EndEvent, where Task_2's reject action
 * routes the gateway back to Task_1 (backwards navigation). Task_1 has a form of "levers"
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
 *   processing  = spinner + "Vi behandler forespørselen din" (deliberately never names the target
 *                 task; a "Steg x av y" line shows live progress through the transition's
 *                 workflow steps when the engine reports counts)
 *   failed      = heading "Noe gikk galt" + contact-support blurb + safe details expander
 *                 ("Vis detaljer om feilen"); deliberately NO Retry affordance and NO polling — the
 *                 engine already exhausted its retry budget, so recovery is ops-driven
 *                 (POST process/resume) followed by a manual refresh of the page.
 */

type Levers = {
  delayMs?: 0 | 3000 | 8000 | 15000 | 30000;
  failCount?: 0 | 1 | 2 | 4;
  failKind?: 'retryable' | 'permanent';
  phase?: 'taskEnding' | 'postCommit';
};

// The levers are user-friendly preselected radios (defaults: taskEnding / no delay / no failures /
// retryable), so every option maps a lever value to its descriptive label.
const leverLabels = {
  delayMs: {
    0: 'Ingen – overgangen fullføres umiddelbart',
    3000: 'Kort – ca. 3 sekunder',
    8000: 'Middels – ca. 8 sekunder',
    15000: 'Lang – ca. 15 sekunder',
    30000: 'Svært lang – ca. 30 sekunder',
  },
  failCount: {
    0: 'Ingen – lykkes på første forsøk',
    1: 'Én feil – lykkes på andre forsøk',
    2: 'To feil – lykkes på tredje forsøk',
    4: 'Fire feil – flere automatiske omprøvinger på rad',
  },
  failKind: {
    retryable: 'Forbigående – motoren prøver automatisk på nytt',
    permanent: 'Permanent – behandlingen stopper og feilsiden vises',
  },
  phase: {
    taskEnding: 'Før overgangen fullføres – ventingen vises mens skjemaet fortsatt står på Task 1',
    postCommit: 'Etter overgangen er fullført – ventingen vises på Task 2 (feil her er alltid forbigående)',
  },
} as const;

function fillLevers({ delayMs, failCount, failKind, phase }: Levers) {
  cy.get('#finishedLoading').should('exist');
  if (phase !== undefined) {
    cy.findByRole('radiogroup', { name: /^Når skal/ })
      .findByRole('radio', { name: leverLabels.phase[phase] })
      .click();
  }
  if (delayMs !== undefined) {
    cy.findByRole('radiogroup', { name: 'Forsinkelse' })
      .findByRole('radio', { name: leverLabels.delayMs[delayMs] })
      .click();
  }
  if (failCount !== undefined) {
    cy.findByRole('radiogroup', { name: 'Antall feil før suksess' })
      .findByRole('radio', { name: leverLabels.failCount[failCount] })
      .click();
  }
  if (failKind !== undefined) {
    cy.findByRole('radiogroup', { name: /^Feiltype/ })
      .findByRole('radio', { name: leverLabels.failKind[failKind] })
      .click();
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

    // The preselected defaults (taskEnding / no delay / no failures) are a no-op for both hooks,
    // so the transition commits immediately.
    cy.findByRole('button', { name: 'Send inn' }).click();

    cy.findByRole('heading', { name: 'Task 2', timeout: 30000 }).should('be.visible');
    cy.get('#finishedLoading').should('exist');
    cy.findByRole('button', { name: 'Send inn' }).should('be.visible');
  });

  it('processing (pre-commit): reload during the delay shows the advancing UI, then converges on Task_2', () => {
    cy.startAppInstance(appFrontend.apps.processTransitionTest, { cyUser: 'manager' });
    fillLevers({ delayMs: 8000, phase: 'taskEnding' });

    submitAndReloadDuringTransition();

    // Committed task is still Task_1 during the pre-commit delay, so the reloaded session renders the
    // live "advancing" state and the task's Send inn action is suppressed. The step indicator shows
    // live progress through the transition's workflow steps (exact numbers depend on the command
    // sequence, so only the shape is asserted).
    cy.contains('Vi behandler forespørselen din', { timeout: 15000 }).should('be.visible');
    cy.contains(/Steg \d+ av \d+/).should('be.visible');
    cy.findByRole('button', { name: 'Send inn' }).should('not.exist');
    cy.findByRole('heading', { name: 'Noe gikk galt' }).should('not.exist');

    // After the delay the transition commits to Task_2 out-of-band. The reloaded session is parked on
    // the old Task_1 url, but the poll observes the settled workflow and the page navigates onto the
    // committed task on its own - no reload, no manual navigation, and never the stale-task error.
    cy.findByRole('heading', { name: 'Task 2', timeout: 30000 }).should('be.visible');
    cy.contains('Denne delen av skjemaet er ikke tilgjengelig').should('not.exist');
    cy.get('#finishedLoading').should('exist');
  });

  it('failed (pre-commit permanent): shows the static error page; ops resume + manual refresh recovers', () => {
    cy.startAppInstance(appFrontend.apps.processTransitionTest, { cyUser: 'manager' });
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

    // The failed state deliberately does NOT poll (a terminal failure needs manual intervention
    // either way, so an open tab must not hammer the expensive failed-path read forever): the error
    // page is static and stays put until the user refreshes.
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(5000);
    cy.findByRole('heading', { name: 'Noe gikk galt' }).should('be.visible');

    // Recovery is ops-driven: resume via the API (as ops tooling would). The resume endpoint waits
    // for the workflow to settle, so when it returns, attempt 2 has succeeded and Task_2 committed.
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

    // With no poll, the recovered state surfaces on a manual refresh. The reloaded session arrives
    // on the old Task_1 url with the process already settled on Task_2 (stale on arrival), which
    // keeps the deliberate navigation-error page - its button takes the user to the committed task.
    cy.reload();
    cy.findByRole('heading', { name: 'Noe gikk galt' }).should('not.exist');
    cy.findByRole('button', { name: 'Gå til riktig prosessteg', timeout: 30000 }).click();
    cy.findByRole('heading', { name: 'Task 2', timeout: 30000 }).should('be.visible');
    cy.get('#finishedLoading').should('exist');
  });

  it('retryable (pre-commit): engine auto-retries to success, no manual retry needed', () => {
    cy.startAppInstance(appFrontend.apps.processTransitionTest, { cyUser: 'manager' });
    fillLevers({ delayMs: 3000, failCount: 1, failKind: 'retryable', phase: 'taskEnding' });

    submitAndReloadDuringTransition();

    // A retryable failure keeps the transition in `processing` (the engine auto-retries with backoff);
    // it is NOT the terminal failed state, so the failed error page never shows.
    cy.contains('Vi behandler forespørselen din', { timeout: 15000 }).should('be.visible');
    cy.findByRole('heading', { name: 'Noe gikk galt' }).should('not.exist');

    // Attempt 2 (after the auto-retry + engine backoff) succeeds and commits Task_2 out-of-band; the
    // polling page then navigates onto the committed task on its own - no reload, no manual nav.
    cy.findByRole('heading', { name: 'Task 2', timeout: 45000 }).should('be.visible');
    cy.contains('Denne delen av skjemaet er ikke tilgjengelig').should('not.exist');
    cy.get('#finishedLoading').should('exist');
  });

  it('processing (post-commit): observable on the committed Task_2, then settles to a normal Task_2', () => {
    cy.startAppInstance(appFrontend.apps.processTransitionTest, { cyUser: 'manager' });
    captureInstanceRoot().as('instanceRoot');
    fillLevers({ delayMs: 15000, phase: 'postCommit' });

    // Post-commit failures are always retryable (the events hook wraps throws as retryable), so
    // selecting postCommit hides the permanent option and the app's data processor force-selects
    // the retryable one on the next data sync.
    cy.findByRole('radiogroup', { name: /^Feiltype/ }).within(() => {
      cy.findByRole('radio', { name: leverLabels.failKind.permanent }).should('not.exist');
      cy.findByRole('radio', { name: leverLabels.failKind.retryable }).should('be.checked');
    });

    // The pre-commit hook is a no-op here, so the transition commits to Task_2 quickly; the post-commit
    // MovedToAltinnEvent then delays ~15s in the engine.
    cy.findByRole('button', { name: 'Send inn' }).click();

    // Give the pre-commit steps time to commit Task_2, then open the committed task in a fresh load
    // (concurrent-session style) while the post-commit step is still running.
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(3000);
    cy.get<string>('@instanceRoot').then((root) => cy.visit(`${root}/Task_2`));

    // Committed currentTask is already Task_2 (not idle/receipt), yet the post-commit step is still in
    // flight -> the advancing UI shows on the committed Task_2 and its Send inn is suppressed. This is
    // exactly what a legacy IProcessEnd (which runs on the process-END transition) could NOT surface.
    cy.contains('Vi behandler forespørselen din', { timeout: 20000 }).should('be.visible');
    cy.findByRole('button', { name: 'Send inn' }).should('not.exist');

    // Once the post-commit step completes the status settles and Task_2 renders normally. The url
    // already matches the committed task, so the polling page converges on its own.
    cy.findByRole('heading', { name: 'Task 2', timeout: 30000 }).should('be.visible');
    cy.get('#finishedLoading').should('exist');
    cy.findByRole('button', { name: 'Send inn' }).should('be.visible');
  });

  it('backwards: Task_2 rejects back to Task_1, keeping the levers, and the scenario replays', () => {
    cy.startAppInstance(appFrontend.apps.processTransitionTest, { cyUser: 'manager' });
    fillLevers({ delayMs: 3000, failCount: 1, failKind: 'retryable', phase: 'taskEnding' });

    // Forward: the retryable failure auto-retries and eventually commits Task_2 (sync wait covers
    // the delay + engine backoff, so no reload is needed here).
    cy.findByRole('button', { name: 'Send inn' }).click();
    cy.findByRole('heading', { name: 'Task 2', timeout: 45000 }).should('be.visible');

    // Backwards: the reject action routes the gateway back to Task_1. The backwards transition is
    // never lever-controlled, so it completes without delays or failures.
    cy.findByRole('button', { name: 'Tilbake til Task 1' }).click();
    cy.findByRole('heading', { name: /Task 1/, timeout: 30000 }).should('be.visible');

    // The levers are kept (the data lives on Task_1), and the attempt counter was reset when the
    // forward transition succeeded, so re-submitting replays the same scenario from attempt 1.
    cy.findByRole('radio', { name: leverLabels.delayMs[3000] }).should('be.checked');
    cy.findByRole('radio', { name: leverLabels.failCount[1] }).should('be.checked');
    cy.findByRole('button', { name: 'Send inn' }).click();
    cy.findByRole('heading', { name: 'Task 2', timeout: 45000 }).should('be.visible');
    cy.get('#finishedLoading').should('exist');
  });
});

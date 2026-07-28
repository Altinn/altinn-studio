import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

/**
 * E2E for the live workflow-status state machine (ADR 2026-07-08), driving the REAL workflow engine
 * via the ttd/process-transition-test app instead of intercept stubbing.
 *
 * The app is Task_1 (data) -> gateway -> [Task_Service or Task_ServiceLayout (service task) ->
 * gateway ->] Task_2 (data) -> gateway -> EndEvent, where Task_2's reject action routes back to
 * Task_1 (backwards navigation) and the service tasks' reject action routes back to Task_1 as
 * well (backing out of a failed service task from its failure view). The gateway after Task_1
 * routes through a service task ONLY when the postCommit path is chosen (Task_ServiceLayout -
 * which has a ui folder, so the app's custom layout renders - when serviceView is "layout",
 * Task_Service otherwise); every other path goes straight to Task_2. Task_1 has a form of
 * "levers" that two app hooks read to control the forward transition. The levers describe
 * a scenario:
 *   - path       WHERE the transition misbehaves: "none" (clean), "preCommit" (fail before the
 *                Storage commit, committed=Task_1) or "postCommit" (fail after it,
 *                committed=Task_Service).
 *   - delayMs    a delay injected on every attempt, regardless of attempts/end state.
 *   - attempts   how many times the engine tries the transition; every attempt but the last fails
 *                transiently (auto-retried), and the last settles on endState. attempts=1 => no retry.
 *   - endState   what happens on the last attempt: "success" (transition completes), "failure"
 *                (terminal failure -> error page; every replay fails the same way) or
 *                "failureThenSuccess" (terminal failure once, then success when the failed step
 *                is re-run via process/resume - i.e. the failed task view's "Prøv igjen").
 *   - advance    after a successful settle: "auto" (auto-advance to Task_2) or "park" (succeed
 *                WITHOUT advancing - the process stays on the service task until an out-of-band
 *                process/next releases it; the frontend renders its implicit waiting step, #18935).
 *   - serviceView "default" (Task_Service, built-in waiting/failure views) or "layout"
 *                (Task_ServiceLayout, the app's own layout renders while parked).
 *
 * The two hooks:
 *   - preCommit: an IOnTaskEndingHandler runs the scenario PRE-commit (committed=Task_1), so the
 *     engine surfaces `processing` (delay / transient retries) or `failed` (endState failure) on Task_1.
 *   - postCommit: an IServiceTask ("scenario") runs it POST-commit inside ExecuteServiceTask — a
 *     critical post-commit step of the committed Task_1 -> Task_Service transition — so
 *     `processing` is observable on the committed Task_Service and an endState "failure" is a real
 *     permanent failure (terminal Failed -> frontend `failed`). On success the service task
 *     auto-advances to Task_2. Non-gating side effects (the Altinn event registrations) are
 *     deliberately NOT lever-controlled: they run in fire-and-forget side-effects workflows that
 *     are invisible to the frontend by design (see the noncritical-side-effects ADR).
 *
 * UI strings (app-libs nb.ts, keys process_workflow.*):
 *   processing  = spinner + "Vi jobber med skjemaet ditt" (deliberately never names the target
 *                 task and never shows engine step counts - internal progress means nothing to
 *                 the user)
 *   failed      = heading "Noe gikk galt" + contact-support blurb + safe details expander
 *                 ("Vis detaljer om feilen"); deliberately NO Retry affordance and NO polling — the
 *                 engine already exhausted its retry budget, so the page is static until a refresh.
 *                 EXCEPTION: a failure owned by the current service task renders the service task's
 *                 own view instead (same heading, but WITH "Prøv igjen"/"Gå tilbake" recovery
 *                 buttons) — see the failed (post-commit) test. "Prøv igjen" resumes the failed
 *                 workflow (POST process/resume — a plain process/next is 409-blocked while the
 *                 workflow is failed) and "Gå tilbake" rejects back to Task_1 — see the two
 *                 recovery tests.
 */

type Levers = {
  path?: 'none' | 'preCommit' | 'postCommit';
  delayMs?: 0 | 3000 | 8000 | 15000 | 30000;
  attempts?: 1 | 2 | 3 | 5;
  endState?: 'success' | 'failure' | 'failureThenSuccess';
  advance?: 'auto' | 'park' | 'parkThenRelease';
  serviceView?: 'default' | 'layout';
};

// Button labels from the app's resource.nb.json: Task_1 advances with "Gå til Task 2", Task_2
// submits with "Send inn". Named here so an app-side rename breaks in one visible place.
const task1AdvanceButton = 'Gå til Task 2';
const task2SubmitButton = 'Send inn';

// The levers are Dropdowns whose option labels are the descriptive nb.json strings; dsSelect/have.value
// match on that visible label. Defaults (preselectedOptionIndex 0): none / no delay / 1 attempt /
// success — delayMs, attempts and endState are all hidden while path is "none" (nothing to configure
// on the instant no-error path).
const leverLabels = {
  path: {
    none: 'Ingen scenario – overgangen går rett til Task 2',
    preCommit: 'Før commit – i task-ending-hooken (instansen står fremdeles i Task 1)',
    postCommit: 'Etter commit – i behandlingssteget (service task) etter Task 1',
  },
  delayMs: {
    0: 'Ingen – overgangen fullføres umiddelbart',
    3000: 'Kort – ca. 3 sekunder',
    8000: 'Middels – ca. 8 sekunder',
    15000: 'Lang – ca. 15 sekunder',
    30000: 'Svært lang – ca. 30 sekunder',
  },
  attempts: {
    1: '1 forsøk (ingen gjenprøving)',
    2: '2 forsøk',
    3: '3 forsøk',
    5: '5 forsøk',
  },
  endState: {
    success: 'Suksess – overgangen fullføres',
    failure: 'Feil – behandlingen stopper og feilsiden vises',
    failureThenSuccess: 'Feil, så suksess – behandlingen stopper, men «Prøv igjen» lykkes',
  },
  advance: {
    auto: 'Automatisk – prosessen går selv videre til Task 2',
    park: 'Parker – prosessen blir stående til noen driver den videre',
    parkThenRelease: 'Parker og slipp – kjører videre av seg selv etter ca. 5 sekunder',
  },
  serviceView: {
    default: 'Standard venteside',
    layout: 'Egendefinert layout',
  },
} as const;

// path is applied first so it reveals the delayMs/attempts/endState dropdowns (all hidden while path
// is "none") before we try to fill them.
function fillLevers({ path, delayMs, attempts, endState, advance, serviceView }: Levers) {
  cy.get('#finishedLoading').should('exist');
  if (path !== undefined) {
    cy.dsSelect('#path', leverLabels.path[path]);
  }
  if (delayMs !== undefined) {
    cy.dsSelect('#delayMs', leverLabels.delayMs[delayMs]);
  }
  if (attempts !== undefined) {
    cy.dsSelect('#attempts', leverLabels.attempts[attempts]);
  }
  if (endState !== undefined) {
    cy.dsSelect('#endState', leverLabels.endState[endState]);
  }
  if (advance !== undefined) {
    cy.dsSelect('#advance', leverLabels.advance[advance]);
  }
  if (serviceView !== undefined) {
    cy.dsSelect('#serviceView', leverLabels.serviceView[serviceView]);
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

type ExpectedProcessState = {
  workflowStatus: 'processing' | 'failed' | 'idle';
  currentTask: string;
};

function waitForProcessState(expected: ExpectedProcessState): Cypress.Chainable<string> {
  return captureInstanceRoot().then((instanceRoot) => {
    const processUrl = `${instanceRoot.replace('/instance/', '/instances/')}/process`;

    return cy
      .waitUntil(
        () =>
          cy
            .request({ url: processUrl, failOnStatusCode: false, log: false })
            .then(
              ({ status, body }) =>
                status === 200 &&
                body?.workflow?.status === expected.workflowStatus &&
                body?.currentTask?.elementId === expected.currentTask,
            ),
        {
          timeout: 30000,
          interval: 250,
          errorMsg: `Expected ${expected.currentTask} with workflow status ${expected.workflowStatus}`,
        },
      )
      .then(() => instanceRoot);
  });
}

// Clicks Task_1's advance button and reloads only after the server reports that the transition is
// processing and the committed task is still Task_1.
function submitAndReloadDuringTransition() {
  cy.findByRole('button', { name: task1AdvanceButton }).click();
  waitForProcessState({ workflowStatus: 'processing', currentTask: 'Task_1' }).then(() => cy.reload());
}

describe('Live workflow status (real engine)', () => {
  it('idle: no delay/fail advances straight to Task_2', () => {
    cy.startAppInstance(appFrontend.apps.processTransitionTest, { cyUser: 'manager' });
    cy.get('#finishedLoading').should('exist');
    cy.findByRole('heading', { name: /Task 1/ }).should('be.visible');

    // The preselected default (path "none") is a no-op for both hooks, so the transition commits
    // immediately.
    cy.findByRole('button', { name: task1AdvanceButton }).click();

    cy.findByRole('heading', { name: /Task 2/, timeout: 30000 }).should('be.visible');
    cy.get('#finishedLoading').should('exist');
    cy.findByRole('button', { name: task2SubmitButton }).should('be.visible');
  });

  it('processing (pre-commit): reload during the delay shows the advancing UI, then converges on Task_2', () => {
    cy.startAppInstance(appFrontend.apps.processTransitionTest, { cyUser: 'manager' });
    fillLevers({ path: 'preCommit', delayMs: 8000 });

    submitAndReloadDuringTransition();

    // Committed task is still Task_1 during the pre-commit delay, so the reloaded session renders the
    // live "advancing" state and the task's advance action is suppressed.
    cy.contains('Vi jobber med skjemaet ditt', { timeout: 15000 }).should('be.visible');
    cy.findByRole('button', { name: task1AdvanceButton }).should('not.exist');
    cy.findByRole('heading', { name: 'Noe gikk galt' }).should('not.exist');

    // After the delay the transition commits to Task_2 out-of-band. The reloaded session is parked on
    // the old Task_1 url, but the poll observes the settled workflow and the page navigates onto the
    // committed task on its own - no reload, no manual navigation, and never the stale-task error.
    cy.findByRole('heading', { name: /Task 2/, timeout: 30000 }).should('be.visible');
    cy.contains('Denne delen av skjemaet er ikke tilgjengelig').should('not.exist');
    cy.get('#finishedLoading').should('exist');
  });

  it('failed (pre-commit): a terminal failure shows the static error page and stays put', () => {
    cy.startAppInstance(appFrontend.apps.processTransitionTest, { cyUser: 'manager' });
    // attempts 1 + endState failure => the single attempt fails terminally.
    fillLevers({ path: 'preCommit', attempts: 1, endState: 'failure' });

    cy.findByRole('button', { name: task1AdvanceButton }).click();

    // The engine stops (ResumeRequired) -> the failed error page: generic message + contact support +
    // a safe details expander. The engine already exhausted its retry budget, so there is deliberately
    // NO Retry affordance.
    cy.findByRole('heading', { name: 'Noe gikk galt', timeout: 30000 }).should('be.visible');
    cy.findByRole('button', { name: task1AdvanceButton }).should('not.exist');
    cy.findByRole('button', { name: 'Prøv igjen' }).should('not.exist');

    // The details expander exposes only safe structured facts: the kind label plus the two
    // references the user relays to support (the form/instance id and the workflow id).
    cy.findByRole('button', { name: 'Vis detaljer om feilen' }).click();
    cy.contains('Et steg i behandlingen feilet').should('be.visible');
    cy.contains('Skjemareferanse').should('be.visible');
    cy.contains('Behandlingsreferanse').should('be.visible');

    // The failed state deliberately does NOT poll (a terminal failure needs manual intervention
    // either way, so an open tab must not hammer the expensive failed-path read forever): the error
    // page is static and stays put until the user refreshes.
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(5000);
    cy.findByRole('heading', { name: 'Noe gikk galt' }).should('be.visible');
  });

  it('failed (post-commit): a service-task-owned failure renders the recoverable task view, and stale urls converge onto it', () => {
    cy.startAppInstance(appFrontend.apps.processTransitionTest, { cyUser: 'manager' });
    captureInstanceRoot().as('instanceRoot');
    // Post-commit terminal failure: the pre-commit hook is a no-op, so the transition COMMITS to
    // Task_Service first; then the scenario service task (a critical post-commit step) fails
    // permanently - a real terminal failure, no cancellation tricks.
    fillLevers({ path: 'postCommit', attempts: 1, endState: 'failure' });

    cy.findByRole('button', { name: task1AdvanceButton }).click();

    // A failure OWNED by the current service task (workflow.targetTask === committed service task)
    // does not use the terminal error page: it renders the service task's own view, which keeps the
    // recovery affordances. Same heading text, but WITH retry/back buttons - the generic failed
    // page deliberately has none (cf. the pre-commit failed test above).
    cy.findByRole('heading', { name: 'Noe gikk galt', timeout: 30000 }).should('be.visible');
    cy.contains('En feil oppstod under automatisk behandling av skjemaet.').should('be.visible');
    cy.findByRole('button', { name: 'Prøv igjen' }).should('be.visible');
    cy.findByRole('button', { name: 'Gå tilbake' }).should('be.visible');

    // Stale-url guard (ProcessWrapper regression): load the OLD Task_1 url while Storage has already
    // committed currentTask forward to Task_Service. The wrong-task guard must not bury the failure
    // behind the dead-end "part of form completed" page - for a service-task-owned failure the url
    // converges onto the committed task unconditionally and re-renders its recoverable view.
    cy.get<string>('@instanceRoot').then((root) => cy.visit(`${root}/Task_1`));
    cy.findByRole('heading', { name: 'Noe gikk galt', timeout: 30000 }).should('be.visible');
    cy.findByRole('button', { name: 'Prøv igjen' }).should('be.visible');
    cy.contains('Denne delen av skjemaet er ikke tilgjengelig').should('not.exist');
    cy.findByRole('button', { name: task1AdvanceButton }).should('not.exist');
  });

  it('recovery (post-commit): "Prøv igjen" resumes the failed workflow and advances to Task_2', () => {
    cy.startAppInstance(appFrontend.apps.processTransitionTest, { cyUser: 'manager' });
    // failureThenSuccess: the single attempt fails permanently, but the service task keeps its
    // attempt counter, so the resume-driven replay of the failed step succeeds.
    fillLevers({ path: 'postCommit', attempts: 1, endState: 'failureThenSuccess' });

    cy.findByRole('button', { name: task1AdvanceButton }).click();
    cy.findByRole('heading', { name: 'Noe gikk galt', timeout: 30000 }).should('be.visible');

    // "Prøv igjen" must NOT be a plain process/next (that is 409-blocked while the workflow is
    // failed): it resumes the failed workflow (POST process/resume), the engine re-runs the failed
    // step, the service task succeeds this time and auto-advances - and the page navigates onto the
    // committed Task_2 without a reload.
    cy.findByRole('button', { name: 'Prøv igjen' }).click();
    cy.findByRole('heading', { name: /Task 2/, timeout: 45000 }).should('be.visible');
    cy.contains('Denne delen av skjemaet er ikke tilgjengelig').should('not.exist');
    cy.get('#finishedLoading').should('exist');
    cy.findByRole('button', { name: task2SubmitButton }).should('be.visible');
  });

  it('recovery (post-commit): "Gå tilbake" rejects the failed service task back to Task_1', () => {
    cy.startAppInstance(appFrontend.apps.processTransitionTest, { cyUser: 'manager' });
    fillLevers({ path: 'postCommit', attempts: 1, endState: 'failure' });

    cy.findByRole('button', { name: task1AdvanceButton }).click();
    cy.findByRole('heading', { name: 'Noe gikk galt', timeout: 30000 }).should('be.visible');

    // Backing out: the bpmn-allowed reject supersedes the terminally failed workflow (the engine
    // writes it off) and Gateway_Service routes the reject back to Task_1, where the levers are
    // editable again.
    cy.findByRole('button', { name: 'Gå tilbake' }).click();
    cy.findByRole('heading', { name: /Task 1/, timeout: 30000 }).should('be.visible');
    cy.get('#finishedLoading').should('exist');

    // The failure lever is still selected (the data lives on Task_1); flip the scenario to a clean
    // run and the resubmission goes through the service task to Task_2.
    cy.get('#endState').should('have.value', leverLabels.endState.failure);
    fillLevers({ endState: 'success' });
    cy.findByRole('button', { name: task1AdvanceButton }).click();
    cy.findByRole('heading', { name: /Task 2/, timeout: 45000 }).should('be.visible');
    cy.get('#finishedLoading').should('exist');
  });

  it('parked (post-commit): a healthy parked service task shows the waiting view, survives refresh, and follows the release', () => {
    cy.startAppInstance(appFrontend.apps.processTransitionTest, { cyUser: 'manager' });
    // park: the transition commits and the service task succeeds WITHOUT auto-advancing - the
    // process stays on Task_Service, simulating a task waiting for an external callback.
    fillLevers({ path: 'postCommit', advance: 'park' });

    cy.findByRole('button', { name: task1AdvanceButton }).click();

    // The submitting session lands on the parked service task and renders the implicit waiting
    // step (#18935): spinner + reassurance, with NO recovery buttons - before this feature the
    // parked-but-healthy task showed the failure-styled retry/back screen.
    cy.contains('Vi behandler forespørselen din', { timeout: 30000 }).should('be.visible');
    cy.contains('Du trenger ikke å gjøre noe').should('be.visible');
    cy.findByRole('heading', { name: 'Noe gikk galt' }).should('not.exist');
    cy.findByRole('button', { name: 'Prøv igjen' }).should('not.exist');
    cy.findByRole('button', { name: 'Gå tilbake' }).should('not.exist');

    // The waiting state is server truth (committed task + idle workflow), so a reload lands on
    // the same view.
    waitForProcessState({ workflowStatus: 'idle', currentTask: 'Task_Service' });
    cy.reload();
    cy.contains('Vi behandler forespørselen din', { timeout: 15000 }).should('be.visible');

    // Release the parked task out-of-band (an authorized process/next - what an external
    // callback's handler would trigger). The polling waiting view observes the advance and
    // navigates onto Task_2 on its own - no reload, no manual navigation.
    cy.moveProcessNext();
    cy.findByRole('heading', { name: /Task 2/, timeout: 45000 }).should('be.visible');
    cy.get('#finishedLoading').should('exist');
    cy.findByRole('button', { name: task2SubmitButton }).should('be.visible');
  });

  it('parked (post-commit): parkThenRelease drives itself onwards - no manual trigger', () => {
    cy.startAppInstance(appFrontend.apps.processTransitionTest, { cyUser: 'manager' });
    // parkThenRelease: the service task parks AND schedules its own release (~5s) - the app-side
    // background task drives an ordinary authorized process/next, imitating an external system's
    // callback arriving on its own. The frontend needs no trigger from this session at all.
    fillLevers({ path: 'postCommit', advance: 'parkThenRelease' });

    cy.findByRole('button', { name: task1AdvanceButton }).click();

    cy.contains('Vi behandler forespørselen din', { timeout: 30000 }).should('be.visible');

    // No cy.moveProcessNext() here - the waiting view's poll observes the app's own release and
    // navigates onto Task_2 by itself.
    cy.findByRole('heading', { name: /Task 2/, timeout: 45000 }).should('be.visible');
    cy.get('#finishedLoading').should('exist');
    cy.findByRole('button', { name: task2SubmitButton }).should('be.visible');
  });

  it('parked with a custom layout: the app page renders instead of the default waiting view, and still follows the process', () => {
    cy.startAppInstance(appFrontend.apps.processTransitionTest, { cyUser: 'manager' });
    // serviceView layout routes through Task_ServiceLayout, which has a ui folder: supplying a
    // layout is the app's opt-out of the built-in waiting view.
    fillLevers({ path: 'postCommit', advance: 'park', serviceView: 'layout' });

    cy.findByRole('button', { name: task1AdvanceButton }).click();

    cy.findByRole('heading', { name: 'Egendefinert venteside', timeout: 30000 }).should('be.visible');
    cy.contains('Vi behandler forespørselen din').should('not.exist');

    // Reload: same custom page, from server truth.
    waitForProcessState({ workflowStatus: 'idle', currentTask: 'Task_ServiceLayout' });
    cy.reload();
    cy.findByRole('heading', { name: 'Egendefinert venteside', timeout: 15000 }).should('be.visible');

    // Even with a custom layout, the frontend follows the process (elementType-keyed, not
    // layout-keyed) and carries the user onto Task_2 when the parked task is released.
    cy.moveProcessNext();
    cy.findByRole('heading', { name: /Task 2/, timeout: 45000 }).should('be.visible');
    cy.get('#finishedLoading').should('exist');
  });

  it('failed on the layouted service task: the failure view takes precedence over the custom layout', () => {
    cy.startAppInstance(appFrontend.apps.processTransitionTest, { cyUser: 'manager' });
    fillLevers({ path: 'postCommit', serviceView: 'layout', attempts: 1, endState: 'failure' });

    cy.findByRole('button', { name: task1AdvanceButton }).click();

    // A custom layout must not bury a terminal failure: the recoverable failure view wins over
    // the app's page (#18935 - failure takes precedence over layout).
    cy.findByRole('heading', { name: 'Noe gikk galt', timeout: 30000 }).should('be.visible');
    cy.findByRole('button', { name: 'Prøv igjen' }).should('be.visible');
    cy.findByRole('button', { name: 'Gå tilbake' }).should('be.visible');
    cy.findByRole('heading', { name: 'Egendefinert venteside' }).should('not.exist');
  });

  it('retryable (pre-commit): engine auto-retries to success, no manual retry needed', () => {
    cy.startAppInstance(appFrontend.apps.processTransitionTest, { cyUser: 'manager' });
    // attempts 2 + endState success => the first attempt fails transiently, then the engine
    // auto-retries and the second (last) attempt succeeds.
    fillLevers({ path: 'preCommit', delayMs: 3000, attempts: 2, endState: 'success' });

    submitAndReloadDuringTransition();

    // A transient (retryable) failure keeps the transition in `processing` (the engine auto-retries
    // with backoff); it is NOT the terminal failed state, so the failed error page never shows.
    cy.contains('Vi jobber med skjemaet ditt', { timeout: 15000 }).should('be.visible');
    cy.findByRole('heading', { name: 'Noe gikk galt' }).should('not.exist');

    // Attempt 2 (after the auto-retry + engine backoff) succeeds and commits Task_2 out-of-band; the
    // polling page then navigates onto the committed task on its own - no reload, no manual nav.
    cy.findByRole('heading', { name: /Task 2/, timeout: 45000 }).should('be.visible');
    cy.contains('Denne delen av skjemaet er ikke tilgjengelig').should('not.exist');
    cy.get('#finishedLoading').should('exist');
  });

  it('processing (post-commit): observable on the committed Task_Service, then settles to a normal Task_2', () => {
    cy.startAppInstance(appFrontend.apps.processTransitionTest, { cyUser: 'manager' });
    captureInstanceRoot().as('instanceRoot');
    fillLevers({ path: 'postCommit', delayMs: 15000 });

    // The pre-commit hook is a no-op here, so the transition commits to Task_Service quickly; the
    // scenario service task (a critical post-commit step) then delays ~15s in the engine.
    cy.findByRole('button', { name: task1AdvanceButton }).click();

    // Open the committed task in a fresh load (concurrent-session style) once /process confirms
    // that Task_Service is committed while the post-commit step is still running.
    waitForProcessState({ workflowStatus: 'processing', currentTask: 'Task_Service' }).then((root) =>
      cy.visit(`${root}/Task_Service`),
    );

    // Committed currentTask is already Task_Service (not idle/receipt), yet the post-commit step is
    // still in flight -> the advancing UI shows on the committed service task and no form UI leaks
    // through. This is exactly what a legacy IProcessEnd (which runs on the process-END transition)
    // could NOT surface.
    cy.contains('Vi jobber med skjemaet ditt', { timeout: 20000 }).should('be.visible');
    cy.findByRole('button', { name: task2SubmitButton }).should('not.exist');

    // Once the service task completes it auto-advances to Task_2 and the status settles. The page is
    // parked on the now-old Task_Service url, but the poll observes the settled workflow and
    // navigates onto the committed Task_2 on its own - no reload, no manual navigation.
    cy.findByRole('heading', { name: /Task 2/, timeout: 45000 }).should('be.visible');
    cy.get('#finishedLoading').should('exist');
    cy.findByRole('button', { name: task2SubmitButton }).should('be.visible');
  });

  it('backwards: Task_2 rejects back to Task_1, keeping the levers, and the scenario replays', () => {
    cy.startAppInstance(appFrontend.apps.processTransitionTest, { cyUser: 'manager' });
    fillLevers({ path: 'preCommit', delayMs: 3000, attempts: 2, endState: 'success' });

    // Forward: the transient failure auto-retries and eventually commits Task_2 (sync wait covers the
    // delay + engine backoff, so no reload is needed here).
    cy.findByRole('button', { name: task1AdvanceButton }).click();
    cy.findByRole('heading', { name: /Task 2/, timeout: 45000 }).should('be.visible');

    // Backwards: the reject action routes the gateway back to Task_1. The backwards transition is
    // never lever-controlled, so it completes without delays or failures.
    cy.findByRole('button', { name: 'Tilbake til Task 1' }).click();
    cy.findByRole('heading', { name: /Task 1/, timeout: 30000 }).should('be.visible');

    // The levers are kept (the data lives on Task_1), and the attempt counter was reset when the
    // forward transition succeeded, so re-submitting replays the same scenario from attempt 1.
    cy.get('#path').should('have.value', leverLabels.path.preCommit);
    cy.get('#delayMs').should('have.value', leverLabels.delayMs[3000]);
    cy.get('#attempts').should('have.value', leverLabels.attempts[2]);
    cy.findByRole('button', { name: task1AdvanceButton }).click();
    cy.findByRole('heading', { name: /Task 2/, timeout: 45000 }).should('be.visible');
    cy.get('#finishedLoading').should('exist');
  });
});

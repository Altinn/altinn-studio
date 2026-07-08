import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

/**
 * E2E for the live workflow-status state machine (ADR 2026-07-08). The backend enriches the process
 * state (on the /enriched read) with `workflow: { status, targetTask, failure }`. Here we inject that
 * annotation into the enriched response to prove the frontend state machine drives off the FETCHED
 * status: `processing` blocks the task's actions and shows an advancing state (and keeps polling),
 * `failed` shows a Retry affordance that calls process/resume, and both survive a browser refresh.
 */
function injectWorkflow(status: 'idle' | 'processing' | 'failed', extra: Record<string, unknown> = {}) {
  cy.intercept('GET', '**/instances/*/*/enriched*', (req) => {
    req.continue((res) => {
      if (res.body?.process) {
        res.body.process.workflow = { status, ...extra };
      }
    });
  }).as('enriched');
}

describe('Live workflow status', () => {
  it('processing: suppresses submit, shows advancing state, survives refresh', () => {
    cy.goto('message');
    cy.findByRole('button', { name: 'Send inn' }).should('be.visible');

    injectWorkflow('processing', { targetTask: 'Task_2' });
    cy.reload();

    // The task UI (and its Send inn action) is replaced by the advancing state
    cy.contains('Task_2').should('be.visible');
    cy.findByRole('button', { name: 'Send inn' }).should('not.exist');
    cy.findByRole('heading', { name: 'Ukjent feil' }).should('not.exist');

    // The processing state is driven by the fetched status, so a refresh re-renders it identically
    cy.reload();
    cy.contains('Task_2').should('be.visible');
    cy.findByRole('button', { name: 'Send inn' }).should('not.exist');
  });

  it('failed: shows detail + Retry, and Retry calls process/resume', () => {
    cy.goto('message');
    cy.findByRole('button', { name: 'Send inn' }).should('be.visible');

    injectWorkflow('failed', {
      targetTask: 'Task_2',
      // Raw detail deliberately contains "internal" text — the citizen UI must NOT render it verbatim.
      failure: { detail: 'INTERNAL-should-not-be-shown', kind: 'stepFailed' },
    });
    cy.intercept('POST', '**/process/resume*', { statusCode: 200, body: {} }).as('resume');

    cy.reload();

    // Generic localized message is shown; the raw backend detail is NOT leaked to the citizen
    cy.contains('Noe gikk galt').should('be.visible');
    cy.contains('INTERNAL-should-not-be-shown').should('not.exist');
    cy.findByRole('button', { name: 'Send inn' }).should('not.exist');

    // The Retry affordance triggers process/resume (labelled "retry", not "resume")
    cy.findByRole('button', { name: 'Prøv igjen' }).should('be.visible').click();
    cy.wait('@resume').its('request.method').should('eq', 'POST');

    // Still failed after refresh (fetched-state driven; nothing persisted client-side)
    cy.reload();
    cy.contains('Noe gikk galt').should('be.visible');
    cy.findByRole('button', { name: 'Prøv igjen' }).should('be.visible');
  });

  it('idle: renders the normal task as before', () => {
    cy.goto('message');
    injectWorkflow('idle');
    cy.reload();

    // idle == render normally: the task's Send inn action is present
    cy.findByRole('button', { name: 'Send inn' }).should('be.visible');
    cy.contains('Noe gikk galt').should('not.exist');
  });
});

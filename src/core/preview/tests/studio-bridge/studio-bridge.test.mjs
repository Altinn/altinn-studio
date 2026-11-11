// The Studio bridge, run as preview's page runs it: in a context of its own, with a window framed by Studio.
// Run with: node --test tests/studio-bridge/studio-bridge.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const bridge = readFileSync(
  new URL('../../src/Altinn.Studio.Preview/AppApi/studio-bridge.js', import.meta.url),
  'utf8',
);
const studioOrigin = 'https://studio.test';
const source = 'altinn-studio-preview';

function runBridge({ framed = true, origin = studioOrigin, globals = {}, postMessage } = {}) {
  const posted = [];
  const timers = [];
  const consoleErrors = [];
  const page = {
    document: {
      currentScript: { getAttribute: (name) => (name === 'data-studio-origin' ? origin : null) },
    },
    console: { error: (...args) => consoleErrors.push(args) },
    setTimeout: (callback) => timers.push(callback),
    ...globals,
  };
  page.window = page;
  page.parent = framed
    ? {
        postMessage:
          postMessage ??
          ((message, targetOrigin) => posted.push({ message: structuredClone(message), targetOrigin })),
      }
    : page;
  vm.runInNewContext(bridge, page);
  const flush = () => timers.splice(0).forEach((callback) => callback());
  const lastErrors = () => posted.findLast(({ message }) => message.type === 'componentErrors')?.message.errors;
  return { page, posted, flush, lastErrors, consoleErrors };
}

test('tells Studio that a new page is ready, on Studio’s origin only', () => {
  const { posted } = runBridge();
  assert.deepEqual(posted, [{ message: { type: 'ready', source, version: 1 }, targetOrigin: studioOrigin }]);
});

test('turns on the layout validation of the app frontend, unless the page chose', () => {
  assert.equal(runBridge().page.forceLayoutPropertiesValidation, 'on');
  const chosen = runBridge({ globals: { forceLayoutPropertiesValidation: 'off' } });
  assert.equal(chosen.page.forceLayoutPropertiesValidation, 'off');
});

test('sends the errors the app frontend logs, by component', () => {
  const { page, flush, lastErrors } = runBridge();

  page.logErrorOnce("Layout configuration errors for component '/name':\n- /readOnly: Must be boolean");
  page.logErrorOnce("Data model binding errors for component '/name':\n- Field 'Model.missing' is not in the model");
  page.logErrorOnce("Validation error for 'summary': Målet for oppsummeringen (missing) ble ikke funnet");
  page.logError('Exception thrown when rendering node "button":\n', new TypeError('x is undefined'));
  page.logError("No component definition found for type 'Unknown' (component 'unknown')");
  flush();

  assert.deepEqual(lastErrors(), {
    name: ['/readOnly: Must be boolean', "Field 'Model.missing' is not in the model"],
    summary: ['Målet for oppsummeringen (missing) ble ikke funnet'],
    button: ['TypeError: x is undefined'],
    unknown: ["No component definition found for type 'Unknown' (component 'unknown')"],
  });
});

test('sends the errors together, after the frontend has logged them', () => {
  const { page, posted, flush } = runBridge();

  page.logErrorOnce("Validation error for 'a': first");
  page.logErrorOnce("Validation error for 'b': second");
  assert.equal(posted.length, 1);
  flush();

  assert.equal(posted.length, 2);
  assert.deepEqual(posted[1].message.errors, { a: ['first'], b: ['second'] });
});

test('sends each error once', () => {
  const { page, flush, lastErrors } = runBridge();

  page.logError("Validation error for 'a': same");
  page.logError("Validation error for 'a': same");
  flush();

  assert.deepEqual(lastErrors(), { a: ['same'] });
});

test('sends nothing for other errors, but still writes them to the console', () => {
  const { page, posted, flush, consoleErrors } = runBridge();

  page.logError('Failed to fetch the options', { status: 500 });
  flush();

  assert.equal(posted.length, 1);
  assert.deepEqual(consoleErrors, [['Failed to fetch the options', { status: 500 }]]);
});

test('logs a message the Once function has logged only once', () => {
  const { page, consoleErrors } = runBridge();

  page.logErrorOnce('the same');
  page.logErrorOnce('the same');

  assert.equal(consoleErrors.length, 1);
});

test('limits what it sends', () => {
  const { page, flush, lastErrors } = runBridge();

  for (let i = 0; i < 250; i++) {
    page.logError(`Validation error for 'component-${i}': error`);
  }
  for (let i = 0; i < 30; i++) {
    page.logError(`Validation error for 'component-0': error ${i}`);
  }
  page.logError(`Validation error for 'component-1': ${'x'.repeat(5000)}`);
  flush();

  const errors = lastErrors();
  assert.equal(Object.keys(errors).length, 200);
  assert.equal(errors['component-0'].length, 20);
  assert.equal(errors['component-1'][1].length, 1000);
});

test('keeps the log functions a page defined before it', () => {
  const logError = () => {};
  const { page } = runBridge({ globals: { logError } });
  assert.equal(page.logError, logError);
  assert.equal(typeof page.logErrorOnce, 'function');
});

test('does nothing outside Studio’s frame, or without Studio’s origin', () => {
  for (const options of [{ framed: false }, { origin: null }]) {
    const { page, posted } = runBridge(options);
    assert.equal(posted.length, 0);
    assert.equal(page.forceLayoutPropertiesValidation, undefined);
    assert.equal(page.logError, undefined);
  }
});

test('lets preview work when it cannot tell Studio', () => {
  const failing = () => {
    throw new Error('Studio is gone');
  };
  const { page, flush, consoleErrors } = runBridge({ postMessage: failing });

  page.logError("Validation error for 'a': error");
  flush();

  assert.equal(consoleErrors.length, 1);
});

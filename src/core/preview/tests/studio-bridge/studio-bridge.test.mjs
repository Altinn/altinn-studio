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

function runBridge({
  framed = true,
  origin = studioOrigin,
  componentErrors = true,
  globals = {},
  postMessage,
} = {}) {
  const posted = [];
  const timers = [];
  const consoleErrors = [];
  const listeners = [];
  const reloads = [];
  const page = {
    document: {
      currentScript: {
        getAttribute: (name) => (name === 'data-studio-origin' ? origin : null),
        hasAttribute: (name) => name === 'data-component-errors' && componentErrors,
      },
    },
    console: { error: (...args) => consoleErrors.push(args) },
    setTimeout: (callback) => timers.push(callback),
    addEventListener: (type, listener) => type === 'message' && listeners.push(listener),
    location: { reload: () => reloads.push(true) },
    ...globals,
  };
  page.window = page;
  page.parent = framed
    ? {
        postMessage:
          postMessage ??
          ((message, targetOrigin) =>
            posted.push({ message: structuredClone(message), targetOrigin })),
      }
    : page;
  vm.runInNewContext(bridge, page);
  const flush = () => timers.splice(0).forEach((callback) => callback());
  const lastErrors = () =>
    posted.findLast(({ message }) => message.type === 'componentErrors')?.message.errors;
  // A message to the page, as Studio's page that frames it posts it unless the options say otherwise.
  const receive = async (type, { from = page.parent, fromOrigin = studioOrigin, ...data } = {}) => {
    listeners.forEach((listener) =>
      listener({
        source: from,
        origin: fromOrigin,
        data: { source: 'altinn-studio', version: 1, type, ...data },
      }),
    );
    await new Promise((resolve) => setImmediate(resolve));
  };
  return { page, posted, flush, lastErrors, consoleErrors, receive, reloads };
}

// The app frontend's query client, with queries for the layouts and the texts, by default the v9 frontend's.
function frontendQueries(keys = ['formBootstrap', 'textResources']) {
  const invalidated = [];
  return {
    invalidated,
    queryClient: {
      getQueryCache: () => ({
        findAll: ({ queryKey }) => (keys.includes(queryKey[0]) ? [{ queryKey }] : []),
      }),
      invalidateQueries: async ({ queryKey }) => invalidated.push([...queryKey]),
    },
  };
}

test('tells Studio that a new page is ready, on Studio’s origin only', () => {
  const { posted } = runBridge();
  assert.deepEqual(posted, [
    { message: { type: 'ready', source, version: 1 }, targetOrigin: studioOrigin },
  ]);
});

test('turns on the layout validation of the app frontend, unless the page chose', () => {
  assert.equal(runBridge().page.forceLayoutPropertiesValidation, 'on');
  const chosen = runBridge({ globals: { forceLayoutPropertiesValidation: 'off' } });
  assert.equal(chosen.page.forceLayoutPropertiesValidation, 'off');
});

test('sends the errors the app frontend logs, by component', () => {
  const { page, flush, lastErrors } = runBridge();

  page.logErrorOnce(
    "Layout configuration errors for component '/name':\n- /readOnly: Must be boolean",
  );
  page.logErrorOnce(
    "Data model binding errors for component '/name':\n- Field 'Model.missing' is not in the model",
  );
  page.logErrorOnce(
    "Validation error for 'summary': Målet for oppsummeringen (missing) ble ikke funnet",
  );
  page.logError(
    'Exception thrown when rendering node "button":\n',
    new TypeError('x is undefined'),
  );
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

test('has the frontend fetch the layouts again when Studio says they changed', async () => {
  const { queryClient, invalidated } = frontendQueries();
  const { receive, reloads } = runBridge({ globals: { queryClient } });

  await receive('layoutsChanged');

  assert.deepEqual(invalidated, [['formBootstrap']]);
  assert.equal(reloads.length, 0);
});

test('gives the frontend the texts preview has now when Studio says they changed', async () => {
  const { queryClient, invalidated } = frontendQueries();
  const fetched = [];
  const textResources = { language: 'nb', resources: [{ id: 'title', value: 'Before' }] };
  const { page, receive, reloads } = runBridge({
    globals: {
      queryClient,
      org: 'session/ttd',
      app: 'my-app',
      altinnAppGlobalData: { textResources },
      fetch: async (url) => {
        fetched.push(url);
        return {
          ok: true,
          json: async () => ({
            language: 'nb',
            resources: [{ id: 'title', value: 'After' }],
          }),
        };
      },
    },
  });

  await receive('textsChanged');

  assert.deepEqual(fetched, ['/session/ttd/my-app/api/v1/texts/nb']);
  assert.deepEqual(page.altinnAppGlobalData.textResources.resources, [
    { id: 'title', value: 'After' },
  ]);
  assert.deepEqual(invalidated, [['textResources']]);
  assert.equal(reloads.length, 0);
});

test('takes changes only from Studio’s page that frames it', async () => {
  const { queryClient, invalidated } = frontendQueries();
  const { receive, reloads } = runBridge({ globals: { queryClient } });

  await receive('layoutsChanged', { from: {} });
  await receive('layoutsChanged', { fromOrigin: 'https://elsewhere.test' });
  await receive('layoutsChanged', { source: 'altinn-studio-preview' });
  await receive('layoutsChanged', { version: 2 });
  await receive('toString');

  assert.deepEqual(invalidated, []);
  assert.equal(reloads.length, 0);
});

test('reloads the page when the frontend has no queries to fetch again', async () => {
  const withoutClient = runBridge();
  await withoutClient.receive('layoutsChanged');
  assert.equal(withoutClient.reloads.length, 1);

  const { queryClient } = frontendQueries();
  queryClient.getQueryCache = () => ({ findAll: () => [] });
  const withoutQueries = runBridge({ globals: { queryClient } });
  await withoutQueries.receive('layoutsChanged');
  assert.equal(withoutQueries.reloads.length, 1);
});

test('reloads the page when it cannot fetch the texts', async () => {
  const { queryClient, invalidated } = frontendQueries();
  const { receive, reloads } = runBridge({
    globals: {
      queryClient,
      altinnAppGlobalData: { textResources: { language: 'nb', resources: [] } },
      fetch: async () => ({ ok: false, status: 404 }),
    },
  });

  await receive('textsChanged');

  assert.deepEqual(invalidated, []);
  assert.equal(reloads.length, 1);
});

test('keeps the texts of the latest change when the answers come in another order', async () => {
  const { queryClient } = frontendQueries();
  const answers = [];
  const textResources = { language: 'nb', resources: [] };
  const { page, receive } = runBridge({
    globals: {
      queryClient,
      org: 'session/ttd',
      app: 'my-app',
      altinnAppGlobalData: { textResources },
      fetch: () => new Promise((resolve) => answers.push(resolve)),
    },
  });
  const answer = (value) => ({
    ok: true,
    json: async () => ({ resources: [{ id: 'title', value }] }),
  });

  await receive('textsChanged');
  await receive('textsChanged');
  answers[1](answer('Latest'));
  await new Promise((resolve) => setImmediate(resolve));
  answers[0](answer('Earlier'));
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(page.altinnAppGlobalData.textResources.resources, [
    { id: 'title', value: 'Latest' },
  ]);
});

test('starts the errors over when the layouts change, and sends those still logged', async () => {
  const { queryClient } = frontendQueries();
  const { page, posted, flush, lastErrors, receive } = runBridge({ globals: { queryClient } });
  page.logErrorOnce("Validation error for 'a': fixed");
  page.logErrorOnce("Validation error for 'b': still wrong");
  flush();

  await receive('layoutsChanged');
  assert.deepEqual(posted.at(-1).message.errors, {});
  page.logErrorOnce("Validation error for 'b': still wrong");
  flush();

  assert.deepEqual(lastErrors(), { b: ['still wrong'] });
});

test('leaves the frontend’s validation and logging alone on a page that doesn’t report errors', () => {
  const { page, posted } = runBridge({ componentErrors: false });

  assert.equal(page.forceLayoutPropertiesValidation, undefined);
  assert.equal(page.logError, undefined);
  assert.equal(page.logErrorOnce, undefined);
  assert.deepEqual(posted, [
    { message: { type: 'ready', source, version: 1 }, targetOrigin: studioOrigin },
  ]);
});

test('has the v8 frontend fetch its layouts, texts and page settings again', async () => {
  const { queryClient, invalidated } = frontendQueries([
    'formLayouts',
    'fetchTextResources',
    'layoutSettings',
  ]);
  const { receive, posted, reloads } = runBridge({
    componentErrors: false,
    globals: { queryClient },
  });

  await receive('layoutsChanged');
  await receive('textsChanged');
  await receive('layoutSettingsChanged');

  assert.deepEqual(invalidated, [['formLayouts'], ['fetchTextResources'], ['layoutSettings']]);
  assert.equal(reloads.length, 0);
  assert.equal(posted.length, 1);
});

test('reloads a v9 page for changed page settings, which the frontend has from the page', async () => {
  const { queryClient, invalidated } = frontendQueries();
  const { receive, reloads } = runBridge({ globals: { queryClient } });

  await receive('layoutSettingsChanged');

  assert.deepEqual(invalidated, []);
  assert.equal(reloads.length, 1);
});

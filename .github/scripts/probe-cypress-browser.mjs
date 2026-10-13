// This worker runs only after the watchdog decides to stop the test run.
import { parentPort, workerData } from 'node:worker_threads';

const socket = new WebSocket(workerData);
const pending = new Map();
const contexts = [];
const diagnostics = { evaluations: [], frames: [], stack: [] };
let sequence = 0;
let paused;
let resuming;

function safeUrl(value) {
  try {
    const url = new URL(value);
    return /^https?:$/.test(url.protocol) ? `${url.origin}${url.pathname}` : url.protocol;
  } catch {
    return '';
  }
}

function report() {
  parentPort.postMessage({ kind: 'state', diagnostics });
}

function request(method, params = {}, timeout = 1500) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`${method} timed out`));
    }, timeout);
    pending.set(id, (message) => {
      clearTimeout(timer);
      if (message.error) reject(new Error(`${method} failed (${message.error.code})`));
      else resolve(message.result);
    });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

socket.onmessage = ({ data }) => {
  const message = JSON.parse(String(data));
  if (message.id) {
    const callback = pending.get(message.id);
    pending.delete(message.id);
    callback?.(message);
  } else if (message.method === 'Runtime.executionContextCreated') {
    const context = message.params.context;
    if (context.auxData?.isDefault && contexts.length < 8) {
      contexts.push({ id: context.id, frameId: context.auxData.frameId });
    }
  } else if (message.method === 'Debugger.paused') {
    diagnostics.stack = message.params.callFrames.slice(0, 30).map((frame) => ({
      functionName: frame.functionName,
      url: safeUrl(frame.url),
      line: frame.location.lineNumber,
      column: frame.location.columnNumber,
    }));
    diagnostics.pauseReason = message.params.reason;
    report();
    // Resume immediately so subsequent probes do not observe our paused state.
    resuming = request('Debugger.resume')
      .then(() => {
        diagnostics.resumed = true;
      })
      .catch((error) => {
        diagnostics.resumeError = error.message;
      });
    paused?.(resuming);
  }
};

socket.onopen = async () => {
  await Promise.all([
    request('Runtime.enable').catch((error) => {
      diagnostics.contextError = error.message;
    }),
    request('Page.getFrameTree')
      .then(({ frameTree }) => {
        const collect = (tree) => {
          if (diagnostics.frames.length >= 20) return;
          const { id, parentId, url } = tree.frame;
          diagnostics.frames.push({ id, parentId, url: safeUrl(url) });
          for (const child of tree.childFrames || []) collect(child);
        };
        collect(frameTree);
      })
      .catch((error) => {
        diagnostics.frameError = error.message;
      }),
    request('Page.captureScreenshot', { format: 'png' })
      .then(({ data }) => {
        parentPort.postMessage({ kind: 'screenshot', data });
      })
      .catch((error) => {
        diagnostics.screenshotError = error.message;
      }),
  ]);
  diagnostics.contexts = contexts;
  report();

  await Promise.all(
    (contexts.length ? contexts : [{}]).map(async (context) => {
      try {
        const result = await request('Runtime.evaluate', {
          expression: '({ readyState: document.readyState, visibility: document.visibilityState })',
          contextId: context.id,
          returnByValue: true,
          timeout: 1000,
        });
        diagnostics.evaluations.push({
          ...context,
          responsive: !result.exceptionDetails,
          page: result.result?.value,
        });
      } catch (error) {
        diagnostics.evaluations.push({ ...context, responsive: false, reason: error.message });
      }
    }),
  );
  diagnostics.responsive = diagnostics.evaluations.some((result) => result.responsive);
  report();

  try {
    await request('Debugger.enable', { maxScriptsCacheSize: 0 });
    const pause = new Promise((resolve) => {
      paused = resolve;
    });
    await request('Debugger.pause');
    await Promise.race([pause, new Promise((resolve) => setTimeout(resolve, 1500))]);
    if (!diagnostics.pauseReason) diagnostics.stackError = 'No debugger pause event';
  } catch (error) {
    diagnostics.stackError = error.message;
  }
  // The pause-event deadline can expire while the resume request is pending.
  await resuming;
  parentPort.postMessage({ kind: 'finished', diagnostics });
};

socket.onerror = () =>
  parentPort.postMessage({
    kind: 'finished',
    diagnostics: { ...diagnostics, connectionError: 'CDP connection failed' },
  });
socket.onclose = () =>
  parentPort.postMessage({
    kind: 'finished',
    diagnostics: { ...diagnostics, connectionClosed: true },
  });

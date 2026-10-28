import { appendFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

// A separate CDP client keeps working when Cypress's renderer/event loop stops.
// Scheduler history must be recorded before the hang; post-hang stacks alone
// cannot explain why a commit failed to complete.
export class BrowserDiagnostics {
  pending = new Map();
  nextId = 1;
  compressedBytes = 0;

  constructor(directory) {
    this.directory = directory;
    this.traceComplete = new Promise((resolve) => {
      this.resolveTrace = resolve;
    });
  }

  async connect(port) {
    const response = await fetch(`http://127.0.0.1:${port}/json/version`, {
      signal: AbortSignal.timeout(3000),
    });
    const { webSocketDebuggerUrl } = await response.json();
    this.socket = new WebSocket(webSocketDebuggerUrl);
    this.socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        clearTimeout(pending.timer);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result);
      } else if (message.method === 'Tracing.tracingComplete') {
        this.traceDataLoss = message.params.dataLossOccurred;
        this.resolveTrace(message.params.stream);
      }
    });
    this.socket.addEventListener('error', () => {});
    this.socket.addEventListener('close', () => this.close());
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.close();
        reject(new Error('CDP connection timed out'));
      }, 3000);
      this.socket.addEventListener(
        'open',
        () => {
          clearTimeout(timer);
          resolve();
        },
        { once: true },
      );
      this.socket.addEventListener(
        'error',
        () => {
          clearTimeout(timer);
          reject(new Error('CDP connection failed'));
        },
        { once: true },
      );
    });
    this.version = await this.send('Browser.getVersion');
    this.tracingStartedAt = Date.now();
    try {
      await this.send(
        'Tracing.start',
        {
          traceConfig: {
            recordMode: 'recordContinuously',
            // Retain task flows until the two-minute inactivity probe confirms
            // a stall, including compositor activity while the main thread waits.
            traceBufferSizeInKb: 256 * 1024,
            // TaskGraph schedule/run flows distinguish an unfinished raster task
            // from a lost activation callback. JSON export drops these flow IDs.
            includedCategories: ['cc', 'disabled-by-default-cc.debug.scheduler', 'toplevel'],
            excludedCategories: ['*'],
          },
          transferMode: 'ReturnAsStream',
          streamFormat: 'proto',
          streamCompression: 'gzip',
        },
        undefined,
        10000,
      );
      this.tracing = true;
    } catch (error) {
      // In particular, never stop a tracing session owned by another client.
      this.traceError = error.message;
      // A timed-out start can already be recording while waiting for a blocked
      // renderer to acknowledge it. Still try to retrieve our partial trace.
      this.tracing = error.message === 'CDP timeout: Tracing.start';
    }
  }

  send(method, params = {}, sessionId, timeout = 3000) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      if (this.socket?.readyState !== WebSocket.OPEN) return reject(new Error('CDP disconnected'));
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP timeout: ${method}`));
      }, timeout);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params, ...(sessionId && { sessionId }) }));
    });
  }

  async probe() {
    const result = { at: Date.now(), browserResponsive: false, targets: [] };
    try {
      const { targetInfos } = await this.send('Target.getTargets');
      result.browserResponsive = true;
      for (const target of targetInfos.filter((target) =>
        ['page', 'iframe'].includes(target.type),
      )) {
        const sample = { id: target.targetId, type: target.type, responsive: false };
        let sessionId;
        try {
          ({ sessionId } = await this.send('Target.attachToTarget', {
            targetId: target.targetId,
            flatten: true,
          }));
          const { result } = await this.send(
            'Runtime.evaluate',
            { expression: 'globalThis.__cypressDiagnosticsProgressAt || 0', returnByValue: true },
            sessionId,
          );
          sample.responsive = true;
          if (Number.isFinite(result.value)) sample.progressAt = result.value;
        } catch (error) {
          sample.error = error.message;
        } finally {
          if (sessionId) await this.send('Target.detachFromTarget', { sessionId }).catch(() => {});
        }
        result.targets.push(sample);
      }
    } catch (error) {
      result.error = error.message;
    }
    // Only a timed-out evaluation establishes an unresponsive renderer. A target
    // disappearing during navigation or an attach failure does not justify retry.
    result.blockedTargets = result.targets
      .filter((target) => target.error === 'CDP timeout: Runtime.evaluate')
      .map((target) => target.id);
    return result;
  }

  async saveTrace() {
    this.traceFile ||= path.join(
      this.directory,
      `chrome-scheduler-${this.tracingStartedAt || Date.now()}.pftrace.gz`,
    );
    if (this.tracing) {
      writeFileSync(this.traceFile, '');
      let stream;
      let timer;
      try {
        await this.send('Tracing.end', {}, undefined, 10000);
        stream = await Promise.race([
          this.traceComplete,
          new Promise((resolve) => {
            // Keep the bound alive if Chrome exits before tracingComplete.
            timer = setTimeout(() => resolve(undefined), 30000);
          }),
        ]);
        if (!stream) throw new Error('Chrome trace stream unavailable');
        const deadline = Date.now() + 15000;
        while (!this.traceFinished) {
          if (Date.now() >= deadline) throw new Error('Chrome trace download timed out');
          const chunk = await this.send('IO.read', { handle: stream, size: 1024 * 1024 });
          const data = Buffer.from(chunk.data, chunk.base64Encoded ? 'base64' : 'utf8');
          if (this.compressedBytes + data.length > 32 * 1024 * 1024) {
            this.traceTruncated = true;
            break;
          }
          appendFileSync(this.traceFile, data);
          this.compressedBytes += data.length;
          this.traceFinished = chunk.eof;
        }
      } catch (error) {
        this.traceError = error.message;
      } finally {
        clearTimeout(timer);
        if (stream) await this.send('IO.close', { handle: stream }).catch(() => {});
      }
      this.tracing = false;
    }
    this.writeTraceStatus();
  }

  writeTraceStatus() {
    if (!this.traceFile) return;
    writeFileSync(
      this.traceFile.replace('.pftrace.gz', '.status.json'),
      JSON.stringify(
        {
          version: this.version,
          startedAt: this.tracingStartedAt,
          compressedBytes: this.compressedBytes,
          dataLossOccurred: this.traceDataLoss,
          complete: Boolean(this.traceFinished),
          truncated: Boolean(this.traceTruncated),
          error: this.traceError,
        },
        null,
        2,
      ),
    );
  }

  close() {
    this.writeTraceStatus();
    for (const { reject, timer } of this.pending.values()) {
      clearTimeout(timer);
      reject(new Error('CDP disconnected'));
    }
    this.pending.clear();
    if (this.socket && this.socket.readyState < WebSocket.CLOSING) this.socket.close();
  }
}

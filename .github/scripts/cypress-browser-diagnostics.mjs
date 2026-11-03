// Probe Chrome from outside Cypress so a blocked renderer cannot stop recovery.
// Keep this client read-only until the watchdog confirms a stall.
export class BrowserDiagnostics {
  pending = new Map();
  nextId = 1;

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

  close() {
    for (const { reject, timer } of this.pending.values()) {
      clearTimeout(timer);
      reject(new Error('CDP disconnected'));
    }
    this.pending.clear();
    if (this.socket && this.socket.readyState < WebSocket.CLOSING) this.socket.close();
  }
}

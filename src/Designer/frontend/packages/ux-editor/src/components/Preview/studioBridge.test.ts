import { describe, expect, it } from 'vitest';
import { parseStudioBridgeMessage } from './studioBridge';

const fromBridge = { source: 'altinn-studio-preview', version: 1 };

describe('parseStudioBridgeMessage', () => {
  it('reads that a new page is ready', () => {
    expect(parseStudioBridgeMessage({ ...fromBridge, type: 'ready' })).toEqual({ type: 'ready' });
  });

  it('reads the errors of each component', () => {
    const message = parseStudioBridgeMessage({
      ...fromBridge,
      type: 'componentErrors',
      errors: { name: ['/readOnly: Must be boolean'], summary: ['Målet ble ikke funnet'] },
    });

    expect(message).toEqual({
      type: 'componentErrors',
      errors: new Map([
        ['name', ['/readOnly: Must be boolean']],
        ['summary', ['Målet ble ikke funnet']],
      ]),
    });
  });

  it.each([
    ['nothing', undefined],
    ['a string', 'ready'],
    ['another source', { source: 'app', version: 1, type: 'ready' }],
    ['another version', { ...fromBridge, version: 2, type: 'ready' }],
    ['another type', { ...fromBridge, type: 'reload' }],
    ['errors that are not by component', { ...fromBridge, type: 'componentErrors', errors: ['x'] }],
  ])('ignores %s', (_, data) => {
    expect(parseStudioBridgeMessage(data)).toBeNull();
  });

  it('keeps only the messages that are text, within limits', () => {
    const errors: Record<string, unknown> = Object.fromEntries(
      Array.from({ length: 250 }, (_, i) => [`component-${i}`, ['error']]),
    );
    errors['component-0'] = Array.from({ length: 30 }, (_, i) => `error ${i}`);
    errors['component-1'] = ['x'.repeat(5000), 42, { html: '<b>' }];
    errors['component-2'] = 'not a list';

    const message = parseStudioBridgeMessage({ ...fromBridge, type: 'componentErrors', errors });

    expect(message?.type).toBe('componentErrors');
    const parsed = message?.type === 'componentErrors' ? message.errors : new Map();
    expect(parsed.size).toBe(199);
    expect(parsed.get('component-0')).toHaveLength(20);
    expect(parsed.get('component-1')).toEqual(['x'.repeat(1000)]);
    expect(parsed.has('component-2')).toBe(false);
  });

  it('keeps a component whose ID is a property of every object', () => {
    const errors = JSON.parse('{"__proto__": ["error"], "constructor": ["error"]}');

    const message = parseStudioBridgeMessage({ ...fromBridge, type: 'componentErrors', errors });

    const parsed = message?.type === 'componentErrors' ? message.errors : new Map();
    expect([...parsed.keys()]).toEqual(['__proto__', 'constructor']);
  });
});

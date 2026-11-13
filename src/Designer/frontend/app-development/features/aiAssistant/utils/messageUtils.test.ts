import { describe, expect, it } from 'vitest';
import type { AssistantMessageData } from '@designer/assistant';
import { formatRejectedEventMessage, getAssistantMessageTimestamp } from './messageUtils';

// Test data
const testTimestamp = 1_700_000_000_000;
const baseAssistantMessage: AssistantMessageData = {
  response: 'Hello',
  timestamp: testTimestamp,
};
const texts = { heading: '**Avvist**', suggestionsLabel: 'Forslag:' };

describe('messageUtils', () => {
  describe('formatRejectedEventMessage', () => {
    it('formats rejection reason and suggestions', () => {
      expect(
        formatRejectedEventMessage({ message: 'Nope', suggestions: ['Try A', 'Try B'] }, texts),
      ).toBe(`${texts.heading}\n\nNope\n\n${texts.suggestionsLabel}\nTry A\nTry B`);
    });

    it('omits the suggestions block when there are none', () => {
      expect(formatRejectedEventMessage({ message: 'Nope' }, texts)).toBe(
        `${texts.heading}\n\nNope`,
      );
    });

    it('falls back to the rejection header alone when the event carries no details', () => {
      expect(formatRejectedEventMessage({}, texts)).toBe(texts.heading);
    });
  });

  describe('getAssistantMessageTimestamp', () => {
    it('uses assistant timestamp', () => {
      expect(getAssistantMessageTimestamp(baseAssistantMessage)).toEqual(new Date(testTimestamp));
    });
  });
});

import { describe, expect, it } from 'vitest';
import type { AgentResponse, AssistantMessageData } from '@studio/assistant';
import {
  formatRejectedEventMessage,
  formatRejectionMessage,
  getAssistantMessageTimestamp,
  isAttachmentNotFoundError,
} from './messageUtils';

// Test data
const testTimestamp = 1_700_000_000_000;
const baseAssistantMessage: AssistantMessageData = {
  response: 'Hello',
  timestamp: testTimestamp,
};
const rejectionResult: AgentResponse = {
  accepted: false,
  session_id: 'session-1',
  message: 'Nope',
  parsed_intent: { suggestions: ['Try A', 'Try B'] },
};

const texts = { heading: '**Avvist**', suggestionsLabel: 'Forslag:' };

describe('messageUtils', () => {
  describe('formatRejectionMessage', () => {
    it('formats rejection message with suggestions', () => {
      expect(formatRejectionMessage(rejectionResult, texts)).toBe(
        `${texts.heading}\n\nNope\n\n${texts.suggestionsLabel}\nTry A\nTry B`,
      );
    });
  });

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

  describe('isAttachmentNotFoundError', () => {
    it('recognizes the hub error that SignalR passes on', () => {
      const error = new Error(
        "An unexpected error occurred invoking 'StartWorkflow' on the server. HubException: ATTACHMENT_NOT_FOUND",
      );
      expect(isAttachmentNotFoundError(error)).toBe(true);
    });

    it('returns false for other errors', () => {
      expect(isAttachmentNotFoundError(new Error('Access denied'))).toBe(false);
      expect(isAttachmentNotFoundError('ATTACHMENT_NOT_FOUND')).toBe(false);
    });
  });
});

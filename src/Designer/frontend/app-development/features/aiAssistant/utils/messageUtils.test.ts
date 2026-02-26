import type { AgentResponse, AssistantMessageData } from '@studio/assistant';
import { ErrorMessages } from '@studio/assistant';
import {
  formatErrorMessage,
  formatRejectionMessage,
  getAssistantMessageContent,
  getAssistantMessageTimestamp,
  parseBackendErrorContent,
  shouldSkipBranchOps,
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
const backendErrorDetail = "Error: {'message': 'Bad', 'suggestions': ['First', 'Second']}";

describe('messageUtils', () => {
  describe('formatRejectionMessage', () => {
    it('formats rejection message with suggestions', () => {
      expect(formatRejectionMessage(rejectionResult)).toBe(
        `${ErrorMessages.REQUEST_REJECTED}\n\nNope\n\nSuggestions:\nTry A\nTry B`,
      );
    });
  });

  describe('formatErrorMessage', () => {
    it('formats error messages', () => {
      expect(formatErrorMessage(new Error('Boom'))).toBe(`${ErrorMessages.REQUEST_FAILED}\n\nBoom`);
    });
  });

  describe('parseBackendErrorContent', () => {
    it('parses backend error content with suggestions', () => {
      const error = new Error(JSON.stringify({ detail: backendErrorDetail }));

      expect(parseBackendErrorContent(error)).toBe(
        `${ErrorMessages.REQUEST_REJECTED}\n\nBad\n\n**Suggestions:**\n• First\n• Second`,
      );
    });
  });

  describe('getAssistantMessageContent', () => {
    it('uses assistant response content', () => {
      expect(getAssistantMessageContent(baseAssistantMessage)).toBe('Hello');
    });
  });

  describe('getAssistantMessageTimestamp', () => {
    it('uses assistant timestamp', () => {
      expect(getAssistantMessageTimestamp(baseAssistantMessage)).toEqual(new Date(testTimestamp));
    });
  });

  describe('shouldSkipBranchOps', () => {
    it('returns true for chat mode or explicit flag', () => {
      expect(shouldSkipBranchOps({ mode: 'chat' })).toBe(true);
      expect(shouldSkipBranchOps({ no_branch_operations: true })).toBe(true);
    });
  });
});

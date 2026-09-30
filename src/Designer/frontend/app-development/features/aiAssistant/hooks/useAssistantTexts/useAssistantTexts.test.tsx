import { renderHook } from '@testing-library/react';
import { useAssistantTexts } from './useAssistantTexts';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('useAssistantTexts', () => {
  it('maps translation keys into the assistant texts structure', () => {
    const { result } = renderHook(() => useAssistantTexts());

    expect(result.current.heading).toBe(textMock('top_menu.ai_assistant'));
    expect(result.current.textarea.placeholder).toBe(textMock('ai_assistant.textarea_placeholder'));
    expect(result.current.feedback.submit).toBe(textMock('ai_assistant.feedback_submit'));
  });
});

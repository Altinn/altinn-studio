import React from 'react';
import { render, screen } from '@testing-library/react';
import { CodeListsCounterMessage } from './CodeListsCounterMessage';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('CodeListsCounterMessage', () => {
  it('renders the code list counter message with correct text for 0 list elements', () => {
    renderCodeListsCounterMessage(0);
    const codeListCounter = screen.getByText(
      textMock('app_content_library.code_lists_with_text_resources.code_lists_count_info_none'),
    );
    expect(codeListCounter).toBeInTheDocument();
  });

  it('renders the code list counter message with correct text for 1 list elements', () => {
    renderCodeListsCounterMessage(1);
    const codeListCounter = screen.getByText(
      textMock('app_content_library.code_lists_with_text_resources.code_lists_count_info_single'),
    );
    expect(codeListCounter).toBeInTheDocument();
  });

  it('renders the code list counter message with correct text for >1 list elements', () => {
    renderCodeListsCounterMessage(2);
    const codeListCounter = screen.getByText(
      textMock('app_content_library.code_lists_with_text_resources.code_lists_count_info_plural'),
    );
    expect(codeListCounter).toBeInTheDocument();
  });
});

const renderCodeListsCounterMessage = (codeListsCount: number) => {
  render(<CodeListsCounterMessage codeListsCount={codeListsCount} />);
};

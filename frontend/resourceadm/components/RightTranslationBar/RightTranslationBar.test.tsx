import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RightTranslationBarProps } from './RightTranslationBar';
import { RightTranslationBar } from './RightTranslationBar';
import { act } from 'react-dom/test-utils';
import { textMock } from '../../../testing/mocks/i18nMock';

describe('RightTranslationBar', () => {
  const mockOnLanguageChange = jest.fn();
  const mockOnBlur = jest.fn();

  const defaultProps: RightTranslationBarProps = {
    title: 'Title',
    value: { nb: '', nn: '', en: '' },
    onLanguageChange: mockOnLanguageChange,
    showErrors: true,
    onBlur: mockOnBlur,
  };

  it('calls onLanguageChange function when textarea value changes', async () => {
    const user = userEvent.setup();
    render(<RightTranslationBar {...defaultProps} usesTextArea />);

    const nnText: string = 'Nynorsk tekst';

    const nnInput = screen.getByLabelText(`${defaultProps.title} (${textMock('language.nn')})`);
    await act(() => user.type(nnInput, nnText));

    expect(mockOnLanguageChange).toHaveBeenLastCalledWith({
      nb: '',
      nn: nnText[nnText.length - 1],
      en: '',
    });
  });

  it('calls onLanguageChange function when input value changes', async () => {
    const user = userEvent.setup();
    render(<RightTranslationBar {...defaultProps} />);

    const nnText: string = 'Nynorsk tekst';

    const nnInput = screen.getByLabelText(`${defaultProps.title} (${textMock('language.nn')})`);
    await act(() => user.type(nnInput, nnText));

    expect(mockOnLanguageChange).toHaveBeenLastCalledWith({
      nb: '',
      nn: nnText[nnText.length - 1],
      en: '',
    });
  });

  it('calls onBlur function when input loses focus', async () => {
    const user = userEvent.setup();
    render(<RightTranslationBar {...defaultProps} />);

    const nnInput = screen.getByLabelText(`${defaultProps.title} (${textMock('language.nn')})`);
    await act(() => user.click(nnInput));
    await act(() => user.tab());

    expect(mockOnBlur).toHaveBeenCalled();
  });
});

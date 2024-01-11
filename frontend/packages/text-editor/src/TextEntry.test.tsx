import React from 'react';
import { act, screen } from '@testing-library/react';
import { TextEntry, TextEntryProps } from './TextEntry';
import { renderWithMockStore } from '../../ux-editor/src/testing/mocks';
import userEvent from '@testing-library/user-event';
import { textMock } from '../../../testing/mocks/i18nMock';

const mockUpsertTextResource = jest.fn();
const textEntryValue = '';
const APP_NAME = 'appName';
const textId = APP_NAME;

describe('TextEntry', () => {
  afterEach(jest.clearAllMocks);

  it('should render the TextEntry component', () => {
    render();
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it("should not call upsertTextResource when textEntryValue is '' ", async () => {
    const user = userEvent.setup();
    render();
    const inputText1 = screen.getByRole('textbox', { name: 'nb translation' });
    await act(() => user.clear(inputText1));
    expect(mockUpsertTextResource).toHaveBeenCalledTimes(0);
  });

  it("should return nothing when textEntryValue is '' ", async () => {
    const user = userEvent.setup();
    render();
    const inpurText2 = screen.getByRole('textbox', { name: 'nb translation' });
    await act(() => user.clear(inpurText2));
    expect(textEntryValue).toEqual('');
  });

  it('should display validation error message when textId is APP_NAME and textEntryValue is empty', async () => {
    const user = userEvent.setup();
    render();
    const inputText3 = screen.getByRole('textbox', { name: 'nb translation' });
    await act(() => user.clear(inputText3));
    expect(textId).toEqual(APP_NAME);
    expect(screen.getByText(textMock('validation_errors.required'))).toBeInTheDocument();
  });
});

const render = async (props: Partial<TextEntryProps> = {}) => {
  const allProps: TextEntryProps = {
    textId: 'appName',
    lang: 'nb',
    translation: 'Hello',
    upsertTextResource: mockUpsertTextResource,
    className: 'text-entry',
    ...props,
  };

  return renderWithMockStore()(<TextEntry {...allProps} />);
};

import React from 'react';
import type { ILanguageState } from '../features/appData/language/languageSlice';
import { IAppDataState } from '../features/appData/appDataReducers';
import { ITextResource } from '../types/global';
import { TextResourceOption, TextResourceOptionProps } from './TextResource';
import {
  appDataMock,
  languageStateMock,
  renderWithMockStore,
} from '../testing/mocks';
import { screen } from '@testing-library/react';

// Test data:
const id = 'testid';
const value = 'testvalue';
const textResource: ITextResource = { id, value };
const defaultProps: TextResourceOptionProps = { textResource };
const noTextText = 'Ingen tekst';
const texts = { 'ux_editor.no_text': noTextText };

describe('TextResourceOption', () => {
  it('Renders id and value', () => {
    render();
    expect(screen.getByText(id)).toBeInTheDocument();
    expect(screen.getByText(value)).toBeInTheDocument();
  });

  it('Renders "no text" text when there is no text value', () => {
    render({ textResource: { id, value: '' } });
    expect(screen.getByText(id)).toBeInTheDocument();
    expect(screen.getByText(noTextText)).toBeInTheDocument();
  });
});

const render = (props?: Partial<TextResourceOptionProps>) => {
  const languageState: ILanguageState = {
    ...languageStateMock,
    language: texts,
  };

  const appData: IAppDataState = {
    ...appDataMock,
    languageState,
  };

  return renderWithMockStore({ appData })(<TextResourceOption {...{ ...defaultProps, ...props }} />);
};

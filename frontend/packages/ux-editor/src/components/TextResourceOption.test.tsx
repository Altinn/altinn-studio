import React from 'react';
import type { ITextResource } from 'app-shared/types/global';
import type { TextResourceOptionProps } from './TextResource';
import { TextResourceOption } from './TextResource';
import { render as renderRtl, screen } from '@testing-library/react';
import { mockUseTranslation } from '../../../../testing/mocks/i18nMock';

// Test data:
const id = 'testid';
const value = 'testvalue';
const textResource: ITextResource = { id, value };
const defaultProps: TextResourceOptionProps = { textResource };
const noTextText = 'Ingen tekst';
const texts = { 'ux_editor.no_text': noTextText };

jest.mock('react-i18next', () => ({ useTranslation: () => mockUseTranslation(texts) }));

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

const render = (props?: Partial<TextResourceOptionProps>) =>
  renderRtl(<TextResourceOption {...{ ...defaultProps, ...props }} />);

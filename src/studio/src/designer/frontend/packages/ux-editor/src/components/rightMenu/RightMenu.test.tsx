import React from 'react';
import { IAppDataState } from '../../features/appData/appDataReducers';
import { ILanguageState } from '../../features/appData/language/languageSlice';
import { RightMenuProps, RightMenu } from './RightMenu';
import { appDataMock, languageStateMock, renderWithMockStore } from '../../testing/mocks';
import { screen } from '@testing-library/react';

// Test data:
const defaultProps: RightMenuProps = {
  toggleFileEditor: jest.fn()
};
const contentText = 'Innhold';
const conditionalRenderingText = 'Vis/skjul';
const calculationsText = 'Beregninger';
const texts = {
  'right_menu.content': contentText,
  'right_menu.conditional_rendering': conditionalRenderingText,
  'right_menu.calculations': calculationsText,
}

const contentTabTestId = 'content-tab';
const conditionalRenderingTabTestId = 'conditional-rendering-tab';
const calculationsTabTestId = 'calculations-tab';

// Mocks:
jest.mock('./ContentTab', () => ({
  ContentTab: () => <div data-testid={contentTabTestId} />
}));
jest.mock('./ConditionalRenderingTab', () => ({
  ConditionalRenderingTab: () => <div data-testid={conditionalRenderingTabTestId} />
}));
jest.mock('./CalculationsTab', () => ({
  CalculationsTab: () => <div data-testid={calculationsTabTestId} />
}));

describe('RightMenu', () => {
  it('Renders all tabs', () => {
    render();
    expect(screen.getByText(contentText)).toBeInTheDocument();
    expect(screen.getByText(conditionalRenderingText)).toBeInTheDocument();
    expect(screen.getByText(calculationsText)).toBeInTheDocument();
    expect(screen.getByTestId(contentTabTestId)).toBeInTheDocument();
    expect(screen.getByTestId(conditionalRenderingTabTestId)).toBeInTheDocument();
    expect(screen.getByTestId(calculationsTabTestId)).toBeInTheDocument();
  });
});

const render = (props: Partial<RightMenuProps> = {}) => {

  const languageState: ILanguageState = {
    ...languageStateMock,
    language: texts,
  };

  const appData: IAppDataState = {
    ...appDataMock,
    languageState,
  };

  return renderWithMockStore({ appData })(
    <RightMenu {...{ ...defaultProps, ...props }} />
  );
}

import React from 'react';
import { IAppDataState } from '../../features/appData/appDataReducers';
import { RightMenu } from './RightMenu';
import { appDataMock, renderWithMockStore } from '../../testing/mocks';
import { screen } from '@testing-library/react';
import { mockUseTranslation } from '../../../../../testing/mocks/i18nMock';

// Test data:
const contentText = 'Innhold';
const conditionalRenderingText = 'Vis/skjul';
const calculationsText = 'Beregninger';
const texts = {
  'right_menu.content': contentText,
  'right_menu.conditional_rendering': conditionalRenderingText,
  'right_menu.calculations': calculationsText,
};

const contentTabTestId = 'content-tab';
const conditionalRenderingTabTestId = 'conditional-rendering-tab';
const calculationsTabTestId = 'calculations-tab';

// Mocks:
jest.mock('./ContentTab', () => ({
  ContentTab: () => <div data-testid={contentTabTestId} />,
}));
jest.mock('./ConditionalRenderingTab', () => ({
  ConditionalRenderingTab: () => <div data-testid={conditionalRenderingTabTestId} />,
}));
jest.mock('./CalculationsTab', () => ({
  CalculationsTab: () => <div data-testid={calculationsTabTestId} />,
}));
jest.mock('react-i18next', () => ({ useTranslation: () => mockUseTranslation(texts) }));

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

const render = (props = {}) => {
  const appData: IAppDataState = { ...appDataMock };
  return renderWithMockStore({ appData })(<RightMenu {...props} />);
};

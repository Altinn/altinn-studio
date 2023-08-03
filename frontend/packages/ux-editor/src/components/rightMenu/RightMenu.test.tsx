import React from 'react';
import { IAppDataState } from '../../features/appData/appDataReducers';
import { RightMenu, RightMenuProps } from './RightMenu';
import { appDataMock, renderWithMockStore } from '../../testing/mocks';
import { render as rtlRender, act, screen, waitFor } from '@testing-library/react';
import { mockUseTranslation } from '../../../../../testing/mocks/i18nMock';
import { FormContext } from '../../containers/FormContext';
import userEvent from '@testing-library/user-event';

const user = userEvent.setup();

// Test data:
const contentText = 'Innhold';
const conditionalRenderingText = 'Vis/skjul';
const calculationsText = 'Beregninger';
const texts = {
  'right_menu.content': contentText,
  'right_menu.dynamics': conditionalRenderingText,
  'right_menu.calculations': calculationsText,
};

const FormContextProviderMock = {
  formId: null,
  form: null,
  handleDiscard: jest.fn(),
  handleEdit: jest.fn(),
  handleUpdate: jest.fn(),
  handleContainerSave: jest.fn().mockImplementation(() => Promise.resolve()),
  handleComponentSave: jest.fn().mockImplementation(() => Promise.resolve()),
}

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
  describe('Content', () => {
    it('Closes content on load', () => {
      render();
      const button = screen.queryByRole("button", { name: contentText });
      expect(button).toHaveAttribute('aria-expanded', "false");
    });

    it('Toggles content when clicked', async () => {
      render();
      const button = screen.queryByRole("button", { name: contentText });
      await act(() => user.click(button));
      expect(button).toHaveAttribute('aria-expanded', "true");
      await act(() => user.click(button));
      expect(button).toHaveAttribute('aria-expanded', "false");
    });

    it('Opens content when a component is selected', async () => {
      const { rerender } = render();
      rerender(getComponent({ formId: 'test2' }));
      const button = screen.queryByRole("button", { name: contentText });
      await waitFor(() => expect(button).toHaveAttribute('aria-expanded', "true"));
    });
  });

  describe('Conditional rendering', () => {
    it('Closes conditional rendering on load', () => {
      render();
      const button = screen.queryByRole("button", { name: conditionalRenderingText });
      expect(button).toHaveAttribute('aria-expanded', "false");
    });

    it('Toggles conditional rendering when clicked', async () => {
      render();
      const button = screen.queryByRole("button", { name: conditionalRenderingText });
      await act(() => user.click(button));
      expect(button).toHaveAttribute('aria-expanded', "true");
      await act(() => user.click(button));
      expect(button).toHaveAttribute('aria-expanded', "false");
    });
  });

  describe('Calculations', () => {
    it('Closes calculations on load', () => {
      render();
      const button = screen.queryByRole("button", { name: calculationsText });
      expect(button).toHaveAttribute('aria-expanded', "false");
    });

    it('Toggles calculations when clicked', async () => {
      render();
      const button = screen.queryByRole("button", { name: calculationsText });
      await act(() => user.click(button));
      expect(button).toHaveAttribute('aria-expanded', "true");
      await act(() => user.click(button));
      expect(button).toHaveAttribute('aria-expanded', "false");
    });
  });

  it('Renders accordion', () => {
    render();
    expect(screen.getByText(contentText)).toBeInTheDocument();
    expect(screen.getByText(conditionalRenderingText)).toBeInTheDocument();
    expect(screen.getByText(calculationsText)).toBeInTheDocument();
    expect(screen.getByTestId(contentTabTestId)).toBeInTheDocument();
    expect(screen.getByTestId(conditionalRenderingTabTestId)).toBeInTheDocument();
    expect(screen.getByTestId(calculationsTabTestId)).toBeInTheDocument();
  });
});

const getComponent = (formContextProps: Partial<FormContext> = {}, rightMenuProps: Partial<RightMenuProps> = {}) => (
  <FormContext.Provider value={{
    ...FormContextProviderMock,
    ...formContextProps
  }}>
    <RightMenu {...rightMenuProps} />
  </FormContext.Provider>
);

const render = (formContextProps: Partial<FormContext> = {}, rightMenuProps: Partial<RightMenuProps> = {}) => {
  return rtlRender(getComponent(formContextProps, rightMenuProps));
};

import React from 'react';
import { RightMenu, RightMenuProps } from './RightMenu';
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
  handleSave: jest.fn().mockImplementation(() => Promise.resolve()),
  debounceSave: jest.fn().mockImplementation(() => Promise.resolve()),
};

const contentTestId = 'content';
const conditionalRenderingTestId = 'conditional-rendering';
const calculationsTestId = 'calculations';

// Mocks:
jest.mock('./Content', () => ({
  Content: () => <div data-testid={contentTestId} />,
}));
jest.mock('./ConditionalRendering', () => ({
  ConditionalRendering: () => <div data-testid={conditionalRenderingTestId} />,
}));
jest.mock('./Calculations', () => ({
  Calculations: () => <div data-testid={calculationsTestId} />,
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
      rerender(getComponent({ formId: 'test' }));
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
    expect(screen.getByTestId(contentTestId)).toBeInTheDocument();
    expect(screen.getByTestId(conditionalRenderingTestId)).toBeInTheDocument();
    expect(screen.getByTestId(calculationsTestId)).toBeInTheDocument();
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

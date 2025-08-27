import React from 'react';
import { Properties } from './Properties';
import { render as rtlRender, screen, waitFor } from '@testing-library/react';
import { FormItemContext } from '../../containers/FormItemContext';
import userEvent from '@testing-library/user-event';
import { formItemContextProviderMock } from '../../testing/formItemContextMocks';
import { textMock } from '@studio/testing/mocks/i18nMock';

const user = userEvent.setup();

// Test data:
const contentText = textMock('right_menu.content');
const dynamicsText = textMock('right_menu.dynamics');
const calculationsText = textMock('right_menu.calculations');

const contentTestId = 'content';
const conditionalRenderingTestId = 'conditional-rendering';
const expressionsTestId = 'expressions';
const calculationsTestId = 'calculations';

// Mocks:
jest.mock('./Content', () => ({
  Content: () => <div data-testid={contentTestId} />,
}));
jest.mock('./ConditionalRendering', () => ({
  ConditionalRendering: () => <div data-testid={conditionalRenderingTestId} />,
}));
jest.mock('../config/Expressions', () => ({
  Expressions: () => <div data-testid={expressionsTestId} />,
}));
jest.mock('./Calculations', () => ({
  Calculations: () => <div data-testid={calculationsTestId} />,
}));

describe('Properties', () => {
  describe('Content', () => {
    it('Closes content on load', () => {
      render();
      const button = screen.queryByRole('button', { name: contentText });
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('Toggles content when clicked', async () => {
      render();
      const button = screen.queryByRole('button', { name: contentText });
      await user.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'true');
      await user.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('Opens content when a component is selected', async () => {
      const { rerender } = render();
      rerender(getComponent({ formItemId: 'test' }));
      const button = screen.queryByRole('button', { name: contentText });
      await waitFor(() => expect(button).toHaveAttribute('aria-expanded', 'true'));
    });
  });

  describe('Dynamics', () => {
    it('Closes dynamics on load', () => {
      render();
      const button = screen.queryByRole('button', { name: dynamicsText });
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('Toggles dynamics when clicked', async () => {
      render();
      const button = screen.queryByRole('button', { name: dynamicsText });
      await user.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'true');
      await user.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('Shows new dynamics by default', async () => {
      const { rerender } = render();
      rerender(getComponent({ formItemId: 'test' }));
      const dynamicsButton = screen.queryByRole('button', {
        name: dynamicsText,
      });
      await user.click(dynamicsButton);
      const newDynamics = screen.getByTestId(expressionsTestId);
      expect(newDynamics).toBeInTheDocument();
    });
  });

  describe('Calculations', () => {
    it('Closes calculations on load', () => {
      render();
      const button = screen.queryByRole('button', { name: calculationsText });
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('Toggles calculations when clicked', async () => {
      render();
      const button = screen.queryByRole('button', { name: calculationsText });
      await user.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'true');
      await user.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });
  });

  it('Renders accordion', () => {
    const formIdMock = 'test-id';
    render({ formItemId: formIdMock });
    expect(screen.getByText(contentText)).toBeInTheDocument();
    expect(screen.getByText(dynamicsText)).toBeInTheDocument();
    expect(screen.getByText(calculationsText)).toBeInTheDocument();
    expect(screen.getByTestId(contentTestId)).toBeInTheDocument();
    expect(screen.getByTestId(expressionsTestId)).toBeInTheDocument();
    expect(screen.getByTestId(calculationsTestId)).toBeInTheDocument();
  });
});

const getComponent = (formItemContextProps: Partial<FormItemContext> = {}) => (
  <FormItemContext.Provider
    value={{
      ...formItemContextProviderMock,
      ...formItemContextProps,
    }}
  >
    <Properties />
  </FormItemContext.Provider>
);

const render = (formItemContextProps: Partial<FormItemContext> = {}) =>
  rtlRender(getComponent(formItemContextProps));

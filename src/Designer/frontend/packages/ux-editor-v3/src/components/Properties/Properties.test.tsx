import { Properties } from './Properties';
import { render as rtlRender, screen, waitFor, within } from '@testing-library/react';
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

const getAccordionSummary = (name: string): HTMLElement => screen.getByText(name);

const getAccordion = (name: string): HTMLElement =>
  screen.getAllByRole('group').find((accordion) => within(accordion).queryByText(name));

const expectToggleAccordion = async (name: string) => {
  await user.click(getAccordionSummary(name));
  expect(getAccordion(name)).toHaveAttribute('open');
  await user.click(getAccordionSummary(name));
  expect(getAccordion(name)).not.toHaveAttribute('open');
};

describe('Properties', () => {
  describe('Content', () => {
    it('Closes content on load', () => {
      render();
      expect(getAccordion(contentText)).not.toHaveAttribute('open');
    });

    it('Toggles content when clicked', async () => {
      render();
      await expectToggleAccordion(contentText);
    });

    it('Opens content when a component is selected', async () => {
      const { rerender } = render();
      rerender(getComponent({ formItemId: 'test' }));
      await waitFor(() => expect(getAccordion(contentText)).toHaveAttribute('open'));
    });
  });

  describe('Dynamics', () => {
    it('Closes dynamics on load', () => {
      render();
      expect(getAccordion(dynamicsText)).not.toHaveAttribute('open');
    });

    it('Toggles dynamics when clicked', async () => {
      render();
      await expectToggleAccordion(dynamicsText);
    });

    it('Shows new dynamics by default', async () => {
      const { rerender } = render();
      rerender(getComponent({ formItemId: 'test' }));
      await user.click(getAccordionSummary(dynamicsText));
      const newDynamics = screen.getByTestId(expressionsTestId);
      expect(newDynamics).toBeInTheDocument();
    });
  });

  describe('Calculations', () => {
    it('Closes calculations on load', () => {
      render();
      expect(getAccordion(calculationsText)).not.toHaveAttribute('open');
    });

    it('Toggles calculations when clicked', async () => {
      render();
      await expectToggleAccordion(calculationsText);
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

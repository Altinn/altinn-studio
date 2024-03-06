import React from 'react';
import { Properties } from './Properties';
import { act, screen } from '@testing-library/react';
import { mockUseTranslation } from '../../../../../testing/mocks/i18nMock';
import { FormItemContext } from '../../containers/FormItemContext';
import userEvent from '@testing-library/user-event';
import { formItemContextProviderMock } from '../../testing/formItemContextMocks';
import { renderWithProviders } from '../../testing/mocks';
import { componentMocks } from '../../testing/componentMocks';
import { ComponentType } from 'app-shared/types/ComponentType';

// Test data:
const textText = 'Tekst';
const dataModelBindingsText = 'Datamodellknytninger';
const contentText = 'Innhold';
const dynamicsText = 'Dynamikk';
const calculationsText = 'Beregninger';
const texts = {
  'right_menu.text': textText,
  'right_menu.dataModelBindings': dataModelBindingsText,
  'right_menu.content': contentText,
  'right_menu.dynamics': dynamicsText,
  'right_menu.calculations': calculationsText,
};

const pageConfigPanelTestId = 'pageConfigPanel';
const textTestId = 'text';
const DataModelBindingsTestId = 'dataModelBindings';
const editFormComponentTestId = 'content';
const conditionalRenderingTestId = 'conditionalRendering';
const expressionsTestId = 'expressions';
const calculationsTestId = 'calculations';

// Mocks:
jest.mock('./PageConfigPanel', () => ({
  PageConfigPanel: () => <div data-testid={pageConfigPanelTestId} />,
}));
jest.mock('./Text', () => ({
  Text: () => <div data-testid={textTestId} />,
}));
jest.mock('./DataModelBindings', () => ({
  DataModelBindings: () => <div data-testid={DataModelBindingsTestId} />,
}));
jest.mock('../config/EditFormComponent', () => ({
  EditFormComponent: () => <div data-testid={editFormComponentTestId} />,
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
jest.mock('react-i18next', () => ({ useTranslation: () => mockUseTranslation(texts) }));

describe('Properties', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Text', () => {
    it('Toggles text when clicked', async () => {
      const user = userEvent.setup();
      renderProperties();
      const button = screen.queryByRole('button', { name: textText });
      await act(() => user.click(button));
      expect(button).toHaveAttribute('aria-expanded', 'true');
      await act(() => user.click(button));
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });
  });
  describe('DataModelBindings', () => {
    it('Toggles dataModelBindings when clicked', async () => {
      const user = userEvent.setup();
      renderProperties();
      const button = screen.queryByRole('button', { name: dataModelBindingsText });
      await act(() => user.click(button));
      expect(button).toHaveAttribute('aria-expanded', 'true');
      await act(() => user.click(button));
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });
  });
  describe('Page config', () => {
    it('shows page config when formItem is undefined', () => {
      renderProperties({ formItem: undefined });
      const pageConfigPanel = screen.getByTestId(pageConfigPanelTestId);
      expect(pageConfigPanel).toBeInTheDocument();
    });
  });
  describe('Component ID Config', () => {
    it('saves the component when changes are made in the properties header', async () => {
      const user = userEvent.setup();
      renderProperties();
      const heading = screen.getByRole('heading', {
        name: `ux_editor.component_title.${componentMocks[ComponentType.Input].type}`,
        level: 2,
      });
      expect(heading).toBeInTheDocument();
      const editComponentIdButton = screen.getByRole('button', { name: /ID/i });
      expect(editComponentIdButton).toBeInTheDocument();
      await act(() => user.click(editComponentIdButton));
      const textbox = screen.getByRole('textbox', {
        name: 'ux_editor.modal_properties_component_change_id',
      });
      const validId = 'valid-id';
      await act(() => user.type(textbox, validId));
      await act(() => user.click(document.body));
      expect(formItemContextProviderMock.handleUpdate).toHaveBeenCalledTimes(1);
      expect(formItemContextProviderMock.debounceSave).toHaveBeenCalledTimes(1);
    });

    it('should not invoke handleUpdate when the id is invalid', async () => {
      const user = userEvent.setup();
      renderProperties();
      await act(() =>
        user.click(
          screen.getByRole('button', { name: `ID: ${componentMocks[ComponentType.Input].id}` }),
        ),
      );
      const invalidId = 'invalidId-01';
      await act(() =>
        user.type(
          screen.getByLabelText('ux_editor.modal_properties_component_change_id'),
          invalidId,
        ),
      );
      expect(formItemContextProviderMock.handleUpdate).not.toHaveBeenCalled();
    });

    it('has all accordion closed by default', async () => {
      const { rerender } = renderProperties();
      rerender(getComponent());
      const textAccordion = screen.getByRole('button', { name: textText });
      expect(textAccordion).toHaveAttribute('aria-expanded', 'false');
      const dataModelBindingsAccordion = screen.getByRole('button', {
        name: dataModelBindingsText,
      });
      expect(dataModelBindingsAccordion).toHaveAttribute('aria-expanded', 'false');
      const contentAccordion = screen.getByRole('button', { name: contentText });
      expect(contentAccordion).toHaveAttribute('aria-expanded', 'false');
      const dynamicsAccordion = screen.getByRole('button', { name: dynamicsText });
      expect(dynamicsAccordion).toHaveAttribute('aria-expanded', 'false');
      const calculationsAccordion = screen.getByRole('button', { name: calculationsText });
      expect(calculationsAccordion).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('Content', () => {
    it('Closes content on load', () => {
      renderProperties();
      const button = screen.queryByRole('button', { name: contentText });
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('Toggles content when clicked', async () => {
      const user = userEvent.setup();
      renderProperties();
      const button = screen.queryByRole('button', { name: contentText });
      await act(() => user.click(button));
      expect(button).toHaveAttribute('aria-expanded', 'true');
      await act(() => user.click(button));
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('Dynamics', () => {
    it('Closes dynamics on load', () => {
      renderProperties();
      const button = screen.queryByRole('button', { name: dynamicsText });
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('Toggles dynamics when clicked', async () => {
      const user = userEvent.setup();
      renderProperties();
      const button = screen.queryByRole('button', { name: dynamicsText });
      await act(() => user.click(button));
      expect(button).toHaveAttribute('aria-expanded', 'true');
      await act(() => user.click(button));
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('Shows new dynamics by default', async () => {
      const user = userEvent.setup();
      renderProperties();
      const dynamicsButton = screen.queryByRole('button', { name: dynamicsText });
      await act(() => user.click(dynamicsButton));
      const newDynamics = screen.getByTestId(expressionsTestId);
      expect(newDynamics).toBeInTheDocument();
    });
  });

  describe('Calculations', () => {
    it('Closes calculations on load', () => {
      renderProperties();
      const button = screen.queryByRole('button', { name: calculationsText });
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('Toggles calculations when clicked', async () => {
      const user = userEvent.setup();
      renderProperties();
      const button = screen.queryByRole('button', { name: calculationsText });
      await act(() => user.click(button));
      expect(button).toHaveAttribute('aria-expanded', 'true');
      await act(() => user.click(button));
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });
  });

  it('Renders properties accordions when formItem is selected', () => {
    renderProperties();
    expect(screen.getByText(textText)).toBeInTheDocument();
    expect(screen.getByText(dataModelBindingsText)).toBeInTheDocument();
    expect(screen.getByText(contentText)).toBeInTheDocument();
    expect(screen.getByText(dynamicsText)).toBeInTheDocument();
    expect(screen.getByText(calculationsText)).toBeInTheDocument();
    expect(screen.getByTestId(textTestId)).toBeInTheDocument();
    expect(screen.getByTestId(DataModelBindingsTestId)).toBeInTheDocument();
    expect(screen.getByTestId(editFormComponentTestId)).toBeInTheDocument();
    expect(screen.getByTestId(expressionsTestId)).toBeInTheDocument();
    expect(screen.getByTestId(calculationsTestId)).toBeInTheDocument();
  });
});

const getComponent = (
  formItemContextProps: Partial<FormItemContext> = {
    formItem: componentMocks[ComponentType.Input],
    formItemId: componentMocks[ComponentType.Input].id,
  },
) => (
  <FormItemContext.Provider
    value={{
      ...formItemContextProviderMock,
      ...formItemContextProps,
    }}
  >
    <Properties />
  </FormItemContext.Provider>
);

const renderProperties = (
  formItemContextProps: Partial<FormItemContext> = {
    formItem: componentMocks[ComponentType.Input],
    formItemId: componentMocks[ComponentType.Input].id,
  },
) => renderWithProviders(getComponent(formItemContextProps));

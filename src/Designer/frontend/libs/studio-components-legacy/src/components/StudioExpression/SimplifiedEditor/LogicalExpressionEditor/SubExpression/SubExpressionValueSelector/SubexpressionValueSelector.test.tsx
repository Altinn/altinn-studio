import { render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import { StudioExpressionContext } from '../../../../StudioExpressionContext';
import type { SubexpressionValueSelectorProps } from './SubexpressionValueSelector';
import { SubexpressionValueSelector } from './SubexpressionValueSelector';
import React from 'react';
import { SimpleSubexpressionValueType } from '../../../../enums/SimpleSubexpressionValueType';
import type { SimpleSubexpressionValue } from '../../../../types/SimpleSubexpressionValue';
import {
  componentIds,
  dataLookupOptions,
  dataModelPointers,
} from '../../../../test-data/dataLookupOptions';
import { texts } from '../../../../test-data/texts';
import userEvent from '@testing-library/user-event';
import { InstanceContext } from '../../../../enums/InstanceContext';
import { ExpressionErrorKey } from '../../../../enums/ExpressionErrorKey';
import { GatewayActionContext } from '../../../../enums/GatewayActionContext';

describe('SubexpressionValueSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('Renders with the given legend in edit mode', () => {
    const legend = 'test-legend';
    renderSubexpressionValueSelector({ legend, isInEditMode: true });
    expect(screen.getByRole('group', { name: legend })).toBeInTheDocument();
  });

  it('Calls the onChange function with a new value when the value type is changed', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderSubexpressionValueSelector({ onChange, isInEditMode: true });
    const select = screen.getByRole('combobox');
    const newValueType = SimpleSubexpressionValueType.Number;
    await user.selectOptions(select, newValueType);
    expect(onChange).toHaveBeenCalledWith({ type: newValueType, value: 0 });
  });

  describe('When the value is a string', () => {
    it('Displays the value in readonly mode', () => {
      renderSubexpressionValueSelector({ value: stringValue, isInEditMode: false });
      screen.getByText('"' + stringValue.value + '"');
    });

    it('Lets the user edit the value in edit mode', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      renderSubexpressionValueSelector({ value: stringValue, isInEditMode: true, onChange });
      const input = screen.getByRole('textbox');
      const addedText = 'A';
      await user.type(input, addedText);
      expect(onChange).toHaveBeenLastCalledWith({
        ...stringValue,
        value: stringValue.value + addedText,
      });
    });
  });

  describe('When the value is a number', () => {
    const numberValue: SimpleSubexpressionValue<SimpleSubexpressionValueType.Number> = {
      type: SimpleSubexpressionValueType.Number,
      value: 42,
    };

    it('Displays the value in readonly mode', () => {
      renderSubexpressionValueSelector({ value: numberValue, isInEditMode: false });
      screen.getByText(numberValue.value.toString());
    });

    it('Lets the user edit the value in edit mode', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      renderSubexpressionValueSelector({ value: numberValue, isInEditMode: true, onChange });
      const input = screen.getByRole('textbox');
      const addedValue = 1;
      await user.type(input, addedValue.toString());
      expect(onChange).toHaveBeenLastCalledWith({ ...numberValue, value: 421 });
    });
  });

  describe.each([true, false])('When the value is %s', (value) => {
    const booleanValue: SimpleSubexpressionValue<SimpleSubexpressionValueType.Boolean> = {
      type: SimpleSubexpressionValueType.Boolean,
      value,
    };
    const booleanText = (b: boolean) => (b ? texts.true : texts.false);

    it('Displays the value in readonly mode', () => {
      renderSubexpressionValueSelector({ value: booleanValue, isInEditMode: false });
      screen.getByText(value ? texts.true : texts.false);
    });

    it('Lets the user edit the value in edit mode', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      renderSubexpressionValueSelector({ value: booleanValue, isInEditMode: true, onChange });
      const newValue = !value;
      await user.click(screen.getByRole('radio', { name: booleanText(newValue) }));
      expect(onChange).toHaveBeenLastCalledWith({ ...booleanValue, value: newValue });
    });
  });

  describe('When the value is a data model field reference', () => {
    const dataModelValue: SimpleSubexpressionValue<SimpleSubexpressionValueType.DataModel> = {
      type: SimpleSubexpressionValueType.DataModel,
      path: dataModelPointers[0],
    };

    it('Displays the path in readonly mode', () => {
      renderSubexpressionValueSelector({ value: dataModelValue, isInEditMode: false });
      screen.getByText(dataModelValue.path);
    });

    it('Renders with the given data model path value in edit mode', () => {
      renderSubexpressionValueSelector({ value: dataModelValue, isInEditMode: true });
      const select = screen.getByRole('combobox', { name: texts.dataModelPath });
      expect(select).toHaveValue(dataModelValue.path);
    });

    it('Renders with an empty combobox in edit mode when the data model path is an empty string', () => {
      renderSubexpressionValueSelector({
        value: { ...dataModelValue, path: '' },
        isInEditMode: true,
      });
      const select = screen.getByRole('combobox', { name: texts.dataModelPath });
      expect(select).toHaveValue('');
    });

    it('Lets the user edit the value in edit mode', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      renderSubexpressionValueSelector({ value: dataModelValue, isInEditMode: true, onChange });
      const newPointer = dataModelPointers[1];
      await user.click(screen.getByRole('combobox', { name: texts.dataModelPath }));
      await user.click(screen.getByRole('option', { name: newPointer }));
      await waitForElementToBeRemoved(screen.queryByRole('listbox')); // Needs to wait here because the Combobox component's change function is asynchronous
      expect(onChange).toHaveBeenCalledWith({ ...dataModelValue, path: newPointer });
    });

    it('Displays an error and does not call the onChange function when the user enters an invalid value', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      renderSubexpressionValueSelector({ value: dataModelValue, isInEditMode: true, onChange });
      const input = screen.getByRole('combobox', { name: texts.dataModelPath });
      await user.type(input, '{backspace}');
      await user.click(document.body);
      expect(await screen.findByText(texts.errorMessages[ExpressionErrorKey.InvalidDataModelPath]));
    });
  });

  describe('When the value is a component reference', () => {
    const componentValue: SimpleSubexpressionValue<SimpleSubexpressionValueType.Component> = {
      type: SimpleSubexpressionValueType.Component,
      id: componentIds[0],
    };

    it('Displays the componentId in readonly mode', () => {
      renderSubexpressionValueSelector({ value: componentValue, isInEditMode: false });
      screen.getByText(componentValue.id);
    });

    it('Renders with the given component id value in edit mode', () => {
      renderSubexpressionValueSelector({ value: componentValue, isInEditMode: true });
      const select = screen.getByRole('combobox', { name: texts.componentId });
      expect(select).toHaveValue(componentValue.id);
    });

    it('Renders with an empty combobox in edit mode when the component id is an empty string', () => {
      renderSubexpressionValueSelector({
        value: { ...componentValue, id: '' },
        isInEditMode: true,
      });
      const select = screen.getByRole('combobox', { name: texts.componentId });
      expect(select).toHaveValue('');
    });

    it('Lets the user edit the value in edit mode', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      renderSubexpressionValueSelector({ value: componentValue, isInEditMode: true, onChange });
      const newId = componentIds[1];
      await user.click(screen.getByRole('combobox', { name: texts.componentId }));
      await user.click(screen.getByRole('option', { name: newId }));
      await waitForElementToBeRemoved(screen.queryByRole('listbox')); // Needs to wait here because the Combobox component's change function is asynchronous
      expect(onChange).toHaveBeenCalledWith({ ...componentValue, id: newId });
    });

    it('Displays an error and does not call the onChange function when the user enters an invalid value', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      renderSubexpressionValueSelector({ value: componentValue, isInEditMode: true, onChange });
      const input = () => screen.getByRole('combobox', { name: texts.componentId });
      await user.type(input(), '{backspace}');
      await user.click(document.body);
      expect(await screen.findByText(texts.errorMessages[ExpressionErrorKey.InvalidComponentId]));
    });

    it('Displays initial error and handles non-existing component ID', () => {
      const id = 'non-existing-id';
      renderSubexpressionValueSelector({ value: { ...componentValue, id }, isInEditMode: true });
      const errorMessage = screen.getByText(
        texts.errorMessages[ExpressionErrorKey.ComponentIDNoLongerExists],
      );
      expect(errorMessage).toBeInTheDocument();
      const input = screen.getByRole('combobox', { name: texts.componentId });
      expect(input).toHaveValue('');
    });
  });

  describe('When the value is an gateway context reference', () => {
    it.each(Object.values(GatewayActionContext))(
      'Displays the key in readonly mode when it is %s',
      (key) => {
        const gatewayContextValue: SimpleSubexpressionValue<SimpleSubexpressionValueType.GatewayActionContext> =
          {
            type: SimpleSubexpressionValueType.GatewayActionContext,
            key,
          };
        renderSubexpressionValueSelector({ value: gatewayContextValue, isInEditMode: false });
        expect(screen.getByText(texts.gatewayActionContext[key]));
      },
    );

    it('Render GatewayAction in readonly mode', () => {
      const gatewayAction: SimpleSubexpressionValue<SimpleSubexpressionValueType.GatewayAction> = {
        type: SimpleSubexpressionValueType.GatewayAction,
        value: 'gatewayAction',
      };
      renderSubexpressionValueSelector({ value: gatewayAction, isInEditMode: false });
      expect(screen.getByText('gatewayAction'));
    });

    it('Lets the user edit the value in edit mode', async () => {
      const gatewayContextValue: SimpleSubexpressionValue<SimpleSubexpressionValueType.GatewayActionContext> =
        {
          type: SimpleSubexpressionValueType.GatewayActionContext,
          key: GatewayActionContext.Pay,
        };
      const user = userEvent.setup();
      const onChange = jest.fn();
      renderSubexpressionValueSelector({
        value: gatewayContextValue,
        isInEditMode: true,
        onChange,
      });
      const newKey = GatewayActionContext.Sign;
      const select = screen.getByLabelText(texts.gatewayActionKey);
      await user.selectOptions(select, newKey);
      expect(onChange).toHaveBeenCalledWith({ ...gatewayContextValue, key: newKey });
    });
  });

  describe('When the value is an gateway action', () => {
    it('should display expression selector only', () => {
      const gatewayAction: SimpleSubexpressionValue<SimpleSubexpressionValueType.GatewayAction> = {
        type: SimpleSubexpressionValueType.GatewayAction,
        value: 'gatewayAction',
      };
      renderSubexpressionValueSelector({ value: gatewayAction, isInEditMode: true });
      expect(screen.getByText('Gateway action'));
    });

    it('should display readonly mode', () => {
      const gatewayAction: SimpleSubexpressionValue<SimpleSubexpressionValueType.GatewayAction> = {
        type: SimpleSubexpressionValueType.GatewayAction,
        value: 'gatewayAction',
      };
      renderSubexpressionValueSelector({ value: gatewayAction, isInEditMode: false });
      expect(screen.getByText('gatewayAction'));
    });
  });

  describe('When the value is an instance context reference', () => {
    it.each(Object.values(InstanceContext))(
      'Displays the key in readonly mode when it is %s',
      (key) => {
        const instanceContextValue: SimpleSubexpressionValue<SimpleSubexpressionValueType.InstanceContext> =
          {
            type: SimpleSubexpressionValueType.InstanceContext,
            key,
          };
        renderSubexpressionValueSelector({ value: instanceContextValue, isInEditMode: false });
        screen.getByText(texts.instanceContext[key]);
      },
    );

    it('Lets the user edit the value in edit mode', async () => {
      const instanceContextValue: SimpleSubexpressionValue<SimpleSubexpressionValueType.InstanceContext> =
        {
          type: SimpleSubexpressionValueType.InstanceContext,
          key: InstanceContext.AppId,
        };
      const user = userEvent.setup();
      const onChange = jest.fn();
      renderSubexpressionValueSelector({
        value: instanceContextValue,
        isInEditMode: true,
        onChange,
      });
      const newKey = InstanceContext.AppId;
      const select = screen.getByRole('combobox', { name: texts.instanceContextKey });
      await user.selectOptions(select, newKey);
      expect(onChange).toHaveBeenCalledWith({ ...instanceContextValue, key: newKey });
    });
  });

  describe('When the value is null', () => {
    it('Displays "null" code in readonly mode', () => {
      const nullValue: SimpleSubexpressionValue<SimpleSubexpressionValueType.Null> = {
        type: SimpleSubexpressionValueType.Null,
      };
      renderSubexpressionValueSelector({ value: nullValue, isInEditMode: false });
      screen.getByText('null');
    });
  });
});

const stringValue: SimpleSubexpressionValue<SimpleSubexpressionValueType.String> = {
  type: SimpleSubexpressionValueType.String,
  value: 'value',
};

const defaultProps: SubexpressionValueSelectorProps = {
  value: stringValue,
  onChange: jest.fn(),
  isInEditMode: false,
  legend: 'legend',
};

const renderSubexpressionValueSelector = (props: Partial<SubexpressionValueSelectorProps> = {}) =>
  render(
    <StudioExpressionContext.Provider value={{ texts, dataLookupOptions }}>
      <SubexpressionValueSelector {...defaultProps} {...props} />
    </StudioExpressionContext.Provider>,
  );

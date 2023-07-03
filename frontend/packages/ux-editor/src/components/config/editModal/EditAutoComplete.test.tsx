import React from 'react';
import { EditAutoComplete } from './EditAutoComplete';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { FormComponent } from '../../../types/FormComponent';
import { renderWithMockStore, renderHookWithMockStore } from '../../../testing/mocks';
import { useLayoutSchemaQuery } from '../../../hooks/queries/useLayoutSchemaQuery';
import expressionSchema from '../../../testing/schemas/json/layout/expression.schema.v1.json';
import numberFormatSchema from '../../../testing/schemas/json/layout/number-format.schema.v1.json';
import layoutSchema from '../../../testing/schemas/json/layout/layout.schema.v1.json';
import { addSchemas } from '../../../utils/formLayoutUtils';

const componentMock: FormComponent = {
  id: 'random-id',
  autocomplete: '',
  type: ComponentType.Input,
  itemType: 'COMPONENT',
  propertyPath: 'definitions/inputComponent',
  dataModelBindings: {},
};

const waitForData = async () => {
  addSchemas([expressionSchema, numberFormatSchema, layoutSchema]);
  const layoutSchemaResult = renderHookWithMockStore()(() => useLayoutSchemaQuery()).renderHookResult.result;
  await waitFor(() => expect(layoutSchemaResult.current.isSuccess).toBe(true));
};

export const render = async (handleComponentChangeMock: any = jest.fn(), component: FormComponent = componentMock) => {
  await waitForData();
  return renderWithMockStore()(<EditAutoComplete handleComponentChange={handleComponentChangeMock} component={component} />);
};

test('should render first 6 suggestions on search field focused', async () => {
  await render();
  const user = userEvent.setup();

  const inputField = screen.getByRole('textbox');
  expect(inputField).toBeInTheDocument();

  await act(() => user.click(inputField));

  expect(await screen.findByRole('dialog')).toBeInTheDocument();
  expect(screen.getAllByRole('option')).toHaveLength(6);
});

test('should filter options while typing in search field', async () => {
  await render();
  const user = userEvent.setup();

  await act(() => user.type(screen.getByRole('textbox'), 'of'));

  await waitFor(() => expect(screen.getByRole('textbox')).toHaveValue('of'));

  expect(screen.getByRole('option', { name: 'off' })).toBeInTheDocument();
  expect(screen.queryByRole('option', { name: 'given-name' })).not.toBeInTheDocument();
});

test('should set the chosen options within the search field', async () => {
  await render();
  const user = userEvent.setup();

  const searchField = screen.getByRole('textbox');

  await act(() => user.type(searchField, 'of'));
  await waitFor(() => expect(searchField).toHaveValue('of'));
  await act(() => user.click(screen.getByRole('option', { name: 'off' })));

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  await waitFor(() => expect(searchField).toHaveValue('off'));
});

test('should toggle autocomplete-popup based onFocus and onBlur', async () => {
  await render();
  const user = userEvent.setup();
  await act(() => user.click(screen.getByRole('textbox')));

  expect(await screen.findByRole('dialog')).toBeInTheDocument();

  await act(() => user.tab());
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('should call handleComponentChangeMock callback ', async () => {
  const handleComponentChangeMock = jest.fn();
  await render(handleComponentChangeMock);

  const user = userEvent.setup();

  const inputField = screen.getByRole('textbox');
  expect(inputField).toBeInTheDocument();

  await act(() => user.click(inputField));
  await screen.findByRole('dialog');

  await act(() => user.click(screen.getByRole('option', { name: 'on' })));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(handleComponentChangeMock).toHaveBeenCalledWith({
    autocomplete: 'on',
    dataModelBindings: {},
    id: 'random-id',
    itemType: 'COMPONENT',
    propertyPath: 'definitions/inputComponent',
    type: 'Input',
  });
});

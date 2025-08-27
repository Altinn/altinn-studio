import React from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../testing/mocks';
import type { IFormLayouts } from '../../../types/global';
import { layout1NameMock, layoutMock } from '@altinn/ux-editor/testing/layoutMock';
import { layoutSet1NameMock } from '@altinn/ux-editor/testing/layoutSetsMock';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { Expressions } from './Expressions';
import { FormItemContext } from '../../../containers/FormItemContext';
import type { FormComponent } from '../../../types/FormComponent';
import { ComponentType } from 'app-shared/types/ComponentType';
import { parsableLogicalExpression } from '../../../testing/expressionMocks';
import type { FormContainer } from '../../../types/FormContainer';
import type { AppContextProps } from '../../../AppContext';
import { ObjectUtils } from 'libs/studio-pure-functions/src';
import { LogicalTupleOperator } from '@studio/components-legacy';
import { app, org } from '@studio/testing/testids';

// Test data:
const layoutSetName = layoutSet1NameMock;
const layouts: IFormLayouts = {
  [layout1NameMock]: layoutMock,
};
const dataModelName = undefined;
const componentWithExpression: FormComponent<ComponentType.Input> = {
  id: 'some-id',
  type: ComponentType.Input,
  dataModelBindings: { simpleBinding: { field: 'some-path', dataType: '' } },
  itemType: 'COMPONENT',
  hidden: parsableLogicalExpression,
};
const componentWithoutExpression: FormComponent<ComponentType.Input> = {
  id: 'some-id',
  type: ComponentType.Input,
  dataModelBindings: { simpleBinding: { field: 'some-path', dataType: '' } },
  itemType: 'COMPONENT',
};

const defaultFormItemContext: FormItemContext = {
  formItem: componentWithExpression,
  handleSave: jest.fn(),
  handleUpdate: jest.fn(),
  formItemId: 'mockId',
  handleDiscard: jest.fn(),
  handleEdit: jest.fn(),
  debounceSave: jest.fn(),
};

describe('Expressions', () => {
  beforeEach(jest.clearAllMocks);

  it('renders add new expression button when there are no existing expressions on component', async () => {
    renderExpressions({ formItem: componentWithoutExpression });
    screen.getByRole('button', { name: textMock('right_menu.expressions_add') });
  });

  it('renders the expression and the button for adding an expression when the hidden field on the component has an expression', () => {
    renderExpressions();
    const expressionName = textMock('right_menu.expressions_property_preview_hidden');
    screen.getByRole('group', { name: expressionName });
    screen.getByRole('button', { name: textMock('right_menu.expressions_add') });
  });

  it('Disables the add button when all supported expression properties are set on a simple component', () => {
    const componentWithMultipleExpressions: FormComponent = {
      id: 'some-id',
      type: ComponentType.Input,
      dataModelBindings: { simpleBinding: { field: 'some-path', dataType: '' } },
      itemType: 'COMPONENT',
      hidden: parsableLogicalExpression,
      required: parsableLogicalExpression,
      readOnly: parsableLogicalExpression,
    };
    renderExpressions({ formItem: componentWithMultipleExpressions });
    const addButton = screen.getByRole('button', { name: textMock('right_menu.expressions_add') });
    expect(addButton).toBeDisabled();
    const expressionLimitAlert = textMock('right_menu.expressions_expressions_limit_reached_alert');
    expect(addButton).toHaveAccessibleDescription(expressionLimitAlert);
  });

  it('Disables the add button when all supported expression properties are set on a repeating group', () => {
    const groupComponentWithAllBooleanFieldsAsExpressions: FormContainer<ComponentType.RepeatingGroup> =
      {
        id: 'some-id',
        itemType: 'CONTAINER',
        type: ComponentType.RepeatingGroup,
        dataModelBindings: { group: { field: 'some-path', dataType: '' } },
        hidden: parsableLogicalExpression,
        edit: {
          addButton: parsableLogicalExpression,
          alertOnDelete: parsableLogicalExpression,
          deleteButton: parsableLogicalExpression,
          editButton: parsableLogicalExpression,
          saveAndNextButton: parsableLogicalExpression,
          saveButton: parsableLogicalExpression,
        },
      };
    renderExpressions({ formItem: groupComponentWithAllBooleanFieldsAsExpressions });
    const addButton = screen.getByRole('button', { name: textMock('right_menu.expressions_add') });
    expect(addButton).toBeDisabled();
  });

  it('Calls the handleUpdate function with the updated component when the user adds a new expression using the dropdown menu', async () => {
    const user = userEvent.setup();
    const handleUpdate = jest.fn();
    renderExpressions({ handleUpdate });
    const addButton = screen.getByRole('button', { name: textMock('right_menu.expressions_add') });
    await user.click(addButton);
    const menuitemName = textMock('right_menu.expressions_property_read_only');
    const menuitem = screen.getByRole('menuitem', { name: menuitemName });
    await user.click(menuitem);
    expect(handleUpdate).toHaveBeenCalledTimes(1);
    expect(handleUpdate).toHaveBeenCalledWith({
      ...componentWithExpression,
      readOnly: null,
    });
  });

  it('Calls the handleUpdate function with the updated component when the user deletes an expression and confirms', async () => {
    const user = userEvent.setup();
    jest.spyOn(window, 'confirm').mockImplementation(() => true);
    const handleUpdate = jest.fn();
    renderExpressions({ handleUpdate });
    const expressionName = textMock('right_menu.expressions_property_preview_hidden');
    const expression = screen.getByRole('group', { name: expressionName });
    const deleteButtonName = textMock('right_menu.expression_delete');
    const deleteButton = within(expression).getByRole('button', { name: deleteButtonName });
    await user.click(deleteButton);
    expect(handleUpdate).toHaveBeenCalledTimes(1);
    const expectedUpdatedComponent = ObjectUtils.deepCopy(componentWithExpression);
    delete expectedUpdatedComponent.hidden;
    expect(handleUpdate).toHaveBeenCalledWith(expectedUpdatedComponent);
  });

  it('Calls the handleUpdate function with the updated component when the user edits an expression', async () => {
    const user = userEvent.setup();
    const handleUpdate = jest.fn();
    renderExpressions({ handleUpdate });
    const expressionName = textMock('right_menu.expressions_property_preview_hidden');
    const expression = screen.getByRole('group', { name: expressionName });
    const orButtonName = textMock('expression.logicalTupleOperator.or');
    const orButton = within(expression).getByRole('radio', { name: orButtonName });
    await user.click(orButton);
    expect(handleUpdate).toHaveBeenCalledTimes(1);
    expect(handleUpdate).toHaveBeenCalledWith({
      ...componentWithExpression,
      hidden: [LogicalTupleOperator.Or, ...parsableLogicalExpression.slice(1)],
    });
  });

  it('Renders successfully when the component is a multipage group', () => {
    const formItem: FormContainer = {
      id: 'some-id',
      itemType: 'CONTAINER',
      type: ComponentType.RepeatingGroup,
      dataModelBindings: { group: { field: 'some-path', dataType: '' } },
      edit: {
        multiPage: true,
      },
    };
    renderExpressions({ formItem });
    screen.getByText(textMock('right_menu.read_more_about_expressions'));
  });

  it('renders link to docs', () => {
    renderExpressions();
    screen.getByRole('link', { name: textMock('right_menu.read_more_about_expressions') });
  });
});

const renderExpressions = (formItemContext: Partial<FormItemContext> = {}) => {
  const appContextProps: Partial<AppContextProps> = { selectedFormLayoutSetName: layoutSetName };

  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.FormLayouts, org, app, layoutSetName], layouts);
  queryClient.setQueryData(
    [QueryKey.DataModelMetadata, org, app, layoutSetName, dataModelName],
    [],
  );

  return renderWithProviders(
    <FormItemContext.Provider value={{ ...defaultFormItemContext, ...formItemContext }}>
      <Expressions />
    </FormItemContext.Provider>,
    { queryClient, appContextProps },
  );
};

import React from 'react';
import { screen } from '@testing-library/react';
import { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { renderWithMockStore } from '../../../testing/mocks';
import { formDesignerMock } from '../../../testing/stateMocks';
import { formContextProviderMock } from '../../../testing/formContextMocks';
import { IFormLayouts } from '../../../types/global';
import { layout1NameMock, layoutMock } from '../../../testing/layoutMock';
import { textMock } from '../../../../../../testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { Expressions } from './Expressions';
import { FormContext } from '../../../containers/FormContext';
import { FormComponent } from '../../../types/FormComponent';
import { ComponentType } from 'app-shared/types/ComponentType';
import { parsableExternalExpression } from '../../../testing/expressionMocks';
import { FormContainer } from '../../../types/FormContainer';

const org = 'org';
const app = 'app';
const layoutSetName = formDesignerMock.layout.selectedLayoutSet;
const layouts: IFormLayouts = {
  [layout1NameMock]: layoutMock,
};

describe('Expressions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('renders existing expressions and addExpressionButton when hidden field on the component has an expression', () => {
    render({});

    const deleteExpressionButton = screen.getByRole('button', { name: textMock('right_menu.expression_delete') });
    expect(deleteExpressionButton).toBeInTheDocument();
    const editExpressionButton = screen.getByRole('button', { name: textMock('right_menu.expression_edit') });
    expect(editExpressionButton).toBeInTheDocument();
    const addExpressionButton = screen.getByRole('button', { name: textMock('right_menu.expressions_add') });
    expect(addExpressionButton).toBeInTheDocument();
    const expressionLimitAlert = screen.queryByText(textMock('right_menu.expressions_expressions_limit_reached_alert'));
    expect(expressionLimitAlert).not.toBeInTheDocument();
  });
  it('renders alert component when there are as many existing expressions as available properties to set expressions on for a regular component', () => {
    const componentWithMultipleExpressions: FormComponent = {
      id: 'some-id',
      type: ComponentType.Input,
      itemType: 'COMPONENT',
      hidden: parsableExternalExpression,
      required: parsableExternalExpression,
      readOnly: parsableExternalExpression
    }
    render({
      component: componentWithMultipleExpressions
    });

    const expressionLimitAlert = screen.queryByText(textMock('right_menu.expressions_expressions_limit_reached_alert'));
    expect(expressionLimitAlert).toBeInTheDocument();
  });
  it('renders alert component when there are as many existing expressions as available properties to set expressions on for a group component', () => {
    const groupComponentWithAllBooleanFieldsAsExpressions: FormContainer = {
      id: 'some-id',
      itemType: 'CONTAINER',
      hidden: parsableExternalExpression,
      required: parsableExternalExpression,
      readOnly: parsableExternalExpression,
      edit: {
        addButton: parsableExternalExpression,
        deleteButton: parsableExternalExpression,
        saveButton: parsableExternalExpression,
        saveAndNextButton: parsableExternalExpression,
      }
    };
    render({
      component: groupComponentWithAllBooleanFieldsAsExpressions
    });

    const expressionLimitAlert = screen.queryByText(textMock('right_menu.expressions_expressions_limit_reached_alert'));
    expect(expressionLimitAlert).toBeInTheDocument();
  });
  it('renders no existing expressions when component fields are boolean', () => {
    const componentWithoutExpressions: FormComponent = {
      id: 'some-id',
      type: ComponentType.Input,
      itemType: 'COMPONENT',
      hidden: true,
      required: false,
      readOnly: true,
    }
    render({
      component: componentWithoutExpressions
    });

    const defaultExpressionSelectProperty = screen.getByRole('combobox', { name: textMock('right_menu.expressions_property') });
    expect(defaultExpressionSelectProperty).toBeInTheDocument();
    expect(defaultExpressionSelectProperty).toHaveValue(textMock('right_menu.expressions_property_select'));
  });
  it('renders link to docs', () => {
    render({});

    const linkToExpressionDocs = screen.getByText(textMock('right_menu.read_more_about_expressions'));
    expect(linkToExpressionDocs).toBeInTheDocument();
  });
});

const componentWithExpression: FormComponent = {
  id: 'some-id',
  type: ComponentType.Input,
  itemType: 'COMPONENT',
  hidden: parsableExternalExpression,
}

const render = ({ props = {}, queries = {}, component = componentWithExpression }: {
  props?: Partial<FormContext>;
  queries?: Partial<ServicesContextProps>;
  component?: FormComponent | FormContainer;
}) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.FormLayouts, org, app, layoutSetName], layouts);
  return renderWithMockStore({}, queries, queryClient)(
    <FormContext.Provider
      value={{
        ...formContextProviderMock,
        form: component,
        formId: component.id,
        ...props,
      }}
    >
      <Expressions/>
    </FormContext.Provider>
    );
};

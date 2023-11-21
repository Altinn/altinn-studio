import React from 'react';
import { screen } from '@testing-library/react';
import {
  internalExpressionWithMultipleSubExpressions,
  parsableExternalExpression,
} from '../../../../testing/expressionMocks';
import { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { renderWithMockStore } from '../../../../testing/mocks';
import { formDesignerMock } from '../../../../testing/stateMocks';
import { IFormLayouts } from '../../../../types/global';
import { layout1NameMock, layoutMock } from '../../../../testing/layoutMock';
import { ExpressionContent, ExpressionContentProps } from './ExpressionContent';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { ExpressionPropertyBase } from '../../../../types/Expressions';
import { FormContext } from '../../../../containers/FormContext';
import { formContextProviderMock } from '../../../../testing/formContextMocks';
import { FormComponent } from '../../../../types/FormComponent';
import { ComponentType } from 'app-shared/types/ComponentType';
import { FormContainer } from '../../../../types/FormContainer';

const org = 'org';
const app = 'app';
const layoutSetName = formDesignerMock.layout.selectedLayoutSet;
const layouts: IFormLayouts = {
  [layout1NameMock]: layoutMock,
};

describe('ExpressionContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('renders an expression in preview when defaultEditMode is false for an existing expression on hidden property', () => {
    render({});

    const nullText = screen.getByText(textMock('right_menu.expressions_data_source_null'));
    expect(nullText).toBeInTheDocument();
    const numberText = screen.getByText(textMock('right_menu.expressions_data_source_number'));
    expect(numberText).toBeInTheDocument();
    const numberValueText = screen.getByText(
      internalExpressionWithMultipleSubExpressions.subExpressions[0].comparableValue as string,
    );
    expect(numberValueText).toBeInTheDocument();
    const booleanText = screen.getByText(textMock('right_menu.expressions_data_source_boolean'));
    expect(booleanText).toBeInTheDocument();
    const booleanValueText = screen.getByText(textMock('general.true'));
    expect(booleanValueText).toBeInTheDocument();
    const componentText = screen.getByText(
      textMock('right_menu.expressions_data_source_component'),
    );
    expect(componentText).toBeInTheDocument();
    const componentValueText = screen.getByText(
      internalExpressionWithMultipleSubExpressions.subExpressions[1].comparableValue as string,
    );
    expect(componentValueText).toBeInTheDocument();
  });

  it('renders an expression in edit mode when defaultEditMode is true for an existing expression with three subexpressions on hidden property', () => {
    render({
      props: {
        defaultEditMode: true,
      },
    });

    const propertyPreviewText = screen.getByText(
      textMock('right_menu.expressions_property_preview_hidden'),
    );
    expect(propertyPreviewText).toBeInTheDocument();
    const functionSelectComponent = screen.queryAllByRole('combobox', {
      name: textMock('right_menu.expressions_function'),
    });
    expect(functionSelectComponent).toHaveLength(3);
    const dataSourceSelectComponent = screen.queryAllByRole('combobox', {
      name: textMock('right_menu.expressions_data_source'),
    });
    expect(dataSourceSelectComponent).toHaveLength(3);
    const dataSourceValueSelectComponent = screen.queryAllByRole('combobox', {
      name: textMock('right_menu.expressions_data_source_value'),
    });
    expect(dataSourceValueSelectComponent).toHaveLength(1);
    const comparableDataSourceSelectComponent = screen.queryAllByRole('combobox', {
      name: textMock('right_menu.expressions_comparable_data_source'),
    });
    expect(comparableDataSourceSelectComponent).toHaveLength(3);
    const comparableDataSourceValueSelectComponent = screen.queryAllByRole('textbox');
    expect(comparableDataSourceValueSelectComponent).toHaveLength(2);
    const saveExpressionButton = screen.getByRole('button', { name: textMock('general.save') });
    expect(saveExpressionButton).toBeInTheDocument();
  });
});

const componentWithExpression: FormComponent = {
  id: 'some-id',
  type: ComponentType.Input,
  itemType: 'COMPONENT',
  hidden: parsableExternalExpression,
};

const render = ({
  props = {},
  queries = {},
  component = componentWithExpression,
}: {
  props?: Partial<ExpressionContentProps>;
  queries?: Partial<ServicesContextProps>;
  component?: FormComponent | FormContainer;
}) => {
  const defaultProps: ExpressionContentProps = {
    property: ExpressionPropertyBase.Hidden,
    defaultEditMode: false,
    onDeleteExpression: jest.fn(),
  };
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.FormLayouts, org, app, layoutSetName], layouts);
  return renderWithMockStore(
    {},
    queries,
    queryClient,
  )(
    <FormContext.Provider
      value={{
        ...formContextProviderMock,
        form: component,
        formId: component.id,
        ...props,
      }}
    >
      <ExpressionContent {...defaultProps} {...props} />
    </FormContext.Provider>,
  );
};

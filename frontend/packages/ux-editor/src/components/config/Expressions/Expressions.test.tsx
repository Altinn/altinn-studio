import React from 'react';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { renderWithMockStore } from '../../../testing/mocks';
import { formDesignerMock } from '../../../testing/stateMocks';
import { formContextProviderMock } from '../../../testing/formContextMocks';
import type { IFormLayouts } from '../../../types/global';
import { layout1NameMock, layoutMock } from '../../../testing/layoutMock';
import { textMock } from '../../../../../../testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { Expressions } from './Expressions';
import { FormContext } from '../../../containers/FormContext';
import type { FormComponent } from '../../../types/FormComponent';
import { ComponentType } from 'app-shared/types/ComponentType';
import { parsableExternalExpression } from '../../../testing/expressionMocks';
import type { FormContainer } from '../../../types/FormContainer';

const org = 'org';
const app = 'app';
const layoutSetName = formDesignerMock.layout.selectedLayoutSet;
const layouts: IFormLayouts = {
  [layout1NameMock]: layoutMock,
};
const componentWithExpression: FormComponent = {
  id: 'some-id',
  type: ComponentType.Input,
  itemType: 'COMPONENT',
  hidden: parsableExternalExpression,
};

describe('Expressions', () => {
  beforeEach(jest.clearAllMocks);

  it('renders only add new expression button when there are no existing expressions on component', async () => {
    render({ component: { ...componentWithExpression, hidden: true } });
    const deleteExpressionButtons = screen.queryByRole('button', {
      name: textMock('right_menu.expression_delete'),
    });
    expect(deleteExpressionButtons).not.toBeInTheDocument();
    const addExpressionButton = screen.getByRole('button', {
      name: textMock('right_menu.expressions_add'),
    });
    expect(addExpressionButton).toBeInTheDocument();
  });

  it('renders existing expressions and addExpressionButton when hidden field on the component has an expression', () => {
    render({});

    const deleteExpressionButton = screen.getByRole('button', {
      name: textMock('right_menu.expression_delete'),
    });
    expect(deleteExpressionButton).toBeInTheDocument();
    const editExpressionButton = screen.getByRole('button', {
      name: textMock('right_menu.expression_edit'),
    });
    expect(editExpressionButton).toBeInTheDocument();
    const addExpressionButton = screen.getByRole('button', {
      name: textMock('right_menu.expressions_add'),
    });
    expect(addExpressionButton).toBeInTheDocument();
    const expressionLimitAlert = screen.queryByText(
      textMock('right_menu.expressions_expressions_limit_reached_alert'),
    );
    expect(expressionLimitAlert).not.toBeInTheDocument();
  });

  it('renders alert component when there are as many existing expressions as available properties to set expressions on for a regular component', () => {
    const componentWithMultipleExpressions: FormComponent = {
      id: 'some-id',
      type: ComponentType.Input,
      itemType: 'COMPONENT',
      hidden: parsableExternalExpression,
      required: parsableExternalExpression,
      readOnly: parsableExternalExpression,
    };
    render({
      component: componentWithMultipleExpressions,
    });

    const expressionLimitAlert = screen.queryByText(
      textMock('right_menu.expressions_expressions_limit_reached_alert'),
    );
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
      },
    };
    render({
      component: groupComponentWithAllBooleanFieldsAsExpressions,
    });

    const expressionLimitAlert = screen.getByText(
      textMock('right_menu.expressions_expressions_limit_reached_alert'),
    );
    expect(expressionLimitAlert).toBeInTheDocument();
  });

  it('adds new expression on read only property when read only menuItem is selected after add expression button is clicked', async () => {
    const user = userEvent.setup();
    render({});

    const addExpressionButton = screen.getByRole('button', {
      name: textMock('right_menu.expressions_add'),
    });
    await act(() => user.click(addExpressionButton));
    const propertyDropDownMenuItem = screen.getByRole('menuitem', {
      name: textMock('right_menu.expressions_property_read_only'),
    });
    await act(() => user.click(propertyDropDownMenuItem));

    const newExpression = screen.getByText(
      textMock('right_menu.expressions_property_preview_read_only'),
    );
    expect(newExpression).toBeInTheDocument();
  });

  it('expression is no longer in previewMode when edit expression is clicked', async () => {
    const user = userEvent.setup();
    render({});

    const expressionInPreview = screen.getByText(
      textMock('right_menu.expressions_property_preview_hidden'),
    );
    expect(expressionInPreview).toBeInTheDocument();

    const editExpressionButton = screen.getByRole('button', {
      name: textMock('right_menu.expression_edit'),
    });
    await act(() => user.click(editExpressionButton));

    expect(expressionInPreview).not.toBeInTheDocument();
  });

  it('expression is deleted when delete expression button is clicked', async () => {
    const user = userEvent.setup();
    render({});

    const deleteExpressionButton = screen.getByRole('button', {
      name: textMock('right_menu.expression_delete'),
    });
    expect(deleteExpressionButton).toBeInTheDocument();
    await act(() => user.click(deleteExpressionButton));

    expect(deleteExpressionButton).not.toBeInTheDocument();
  });

  it('Renders successfully when the component is a multipage group', () => {
    const component: FormContainer = {
      id: 'some-id',
      itemType: 'CONTAINER',
      edit: {
        multiPage: true,
      },
    };
    render({ component });
    expect(
      screen.getByText(textMock('right_menu.read_more_about_expressions')),
    ).toBeInTheDocument();
  });

  it('renders no existing expressions when component fields are boolean', () => {
    const componentWithoutExpressions: FormComponent = {
      id: 'some-id',
      type: ComponentType.Input,
      itemType: 'COMPONENT',
      hidden: true,
      required: false,
      readOnly: true,
    };
    render({
      component: componentWithoutExpressions,
    });

    const createRuleForComponentIdText = screen.getByText(
      textMock('right_menu.expressions_property_on_component'),
    );
    expect(createRuleForComponentIdText).toBeInTheDocument();
    const createNewExpressionButton = screen.getByRole('button', {
      name: textMock('right_menu.expressions_add'),
    });
    expect(createNewExpressionButton).toBeInTheDocument();
  });

  it('renders link to docs', () => {
    render({});

    const linkToExpressionDocs = screen.getByText(
      textMock('right_menu.read_more_about_expressions'),
    );
    expect(linkToExpressionDocs).toBeInTheDocument();
  });
});

const render = ({
  props = {},
  queries = {},
  component = componentWithExpression,
}: {
  props?: Partial<FormContext>;
  queries?: Partial<ServicesContextProps>;
  component?: FormComponent | FormContainer;
}) => {
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
      <Expressions />
    </FormContext.Provider>,
  );
};

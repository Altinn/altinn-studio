import React from 'react';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  internalUnParsableComplexExpression,
  simpleInternalExpression,
} from '../../../../../testing/expressionMocks';
import { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { renderWithMockStore } from '../../../../../testing/mocks';
import { formDesignerMock } from '../../../../../testing/stateMocks';
import { IFormLayouts } from '../../../../../types/global';
import { layout1NameMock, layoutMock } from '../../../../../testing/layoutMock';
import { textMock } from '../../../../../../../../testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { componentId } from '../../../../../testing/expressionMocks';
import { ExpressionPreview, ExpressionPreviewProps } from './ExpressionPreview';

const org = 'org';
const app = 'app';
const layoutSetName = formDesignerMock.layout.selectedLayoutSet;
const layouts: IFormLayouts = {
  [layout1NameMock]: layoutMock,
};

describe('ExpressionPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('does not show save button when expression is in previewMode', () => {
    render({});

    const saveExpressionButton = screen.queryByRole('button', { name: textMock('general.save') });
    expect(saveExpressionButton).not.toBeInTheDocument();
  });
  it('renders the complex expression in preview mode when complex expression is set', () => {
    render({
      props: {
        expression: internalUnParsableComplexExpression,
      },
    });

    const complexExpression = screen.getByRole('textbox');
    expect(complexExpression).toBeInTheDocument();
    expect(complexExpression).toHaveValue(internalUnParsableComplexExpression.complexExpression);
    expect(complexExpression).toHaveAttribute('disabled');
    const saveExpressionButton = screen.queryByRole('button', { name: textMock('general.save') });
    expect(saveExpressionButton).not.toBeInTheDocument();
  });
  it('calls onDeleteExpression when deleteExpression button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnDeleteExpression = jest.fn();
    render({
      props: {
        onDeleteExpression: mockOnDeleteExpression,
      },
    });
    const deleteExpressionButton = screen.getByRole('button', {
      name: textMock('right_menu.expression_delete'),
    });
    await act(() => user.click(deleteExpressionButton));
    expect(mockOnDeleteExpression).toHaveBeenCalledWith(simpleInternalExpression);
    expect(mockOnDeleteExpression).toHaveBeenCalledTimes(1);
  });
});

const render = ({
  props = {},
  queries = {},
}: {
  props?: Partial<ExpressionPreviewProps>;
  queries?: Partial<ServicesContextProps>;
}) => {
  const defaultProps: ExpressionPreviewProps = {
    expression: simpleInternalExpression,
    componentName: componentId,
    onSetEditMode: jest.fn(),
    onDeleteExpression: jest.fn(),
  };
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.FormLayouts, org, app, layoutSetName], layouts);
  return renderWithMockStore(
    {},
    queries,
    queryClient,
  )(<ExpressionPreview {...defaultProps} {...props} />);
};

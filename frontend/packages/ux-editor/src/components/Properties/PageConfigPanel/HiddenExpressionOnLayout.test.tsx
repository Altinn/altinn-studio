import React from 'react';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../testing/mocks';
import { QueryKey } from 'app-shared/types/QueryKey';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';
import { HiddenExpressionOnLayout } from './HiddenExpressionOnLayout';
import type { IFormLayouts } from '../../../types/global';
import { layout1NameMock, layoutMock, layoutSetsMock } from '../../../testing/layoutMock';
import { textMock } from '../../../../../../testing/mocks/i18nMock';
import type { BooleanExpression } from '@studio/components';
import { GeneralRelationOperator } from '@studio/components';
import { queriesMock } from 'app-shared/mocks/queriesMock';

// Test data
const app = 'app';
const org = 'org';
const layoutSet = layoutSetsMock.sets[0].id;

const defaultLayouts: IFormLayouts = {
  [layout1NameMock]: layoutMock,
};

describe('HiddenExpressionOnLayout', () => {
  afterEach(() => jest.clearAllMocks());
  it('renders expression builder when layout has no expression set on hidden prop', () => {
    renderHiddenExpressionOnLayout();
    screen.getByRole('group', { name: textMock('right_menu.expressions_property_preview_hidden') });
    expect(
      screen.queryByRole('group', { name: textMock('expression.subExpression', { number: 1 }) }),
    ).not.toBeInTheDocument();
  });

  it('renders defined expression in preview mode when layout has expression set on hidden prop', () => {
    const expression: BooleanExpression = [GeneralRelationOperator.Equals, 1, 1];
    renderHiddenExpressionOnLayout({
      ...defaultLayouts,
      [layout1NameMock]: { ...layoutMock, hidden: expression },
    });
    screen.getByRole('group', { name: textMock('right_menu.expressions_property_preview_hidden') });
    screen.getByRole('group', { name: textMock('expression.subexpression', { number: 1 }) });
  });

  it('calls saveLayout when expression is changed from default', async () => {
    const user = userEvent.setup();
    renderHiddenExpressionOnLayout();
    const addSubExpressionButton = screen.getByRole('button', {
      name: textMock('expression.addSubexpression'),
    });
    await act(() => user.click(addSubExpressionButton));
    expect(queriesMock.saveFormLayout).toHaveBeenCalledTimes(1);
  });

  it('calls saveLayout when existing expression is changed', async () => {
    const user = userEvent.setup();
    const expression: BooleanExpression = [GeneralRelationOperator.Equals, 1, 2];
    renderHiddenExpressionOnLayout({
      ...defaultLayouts,
      [layout1NameMock]: { ...layoutMock, hidden: expression },
    });
    const editExpressionButton = screen.getByRole('button', {
      name: textMock('general.edit'),
    });
    await act(() => user.click(editExpressionButton));
    const saveExpressionButton = screen.getByRole('button', {
      name: textMock('expression.saveAndClose'),
    });
    await act(() => user.click(saveExpressionButton));
    expect(queriesMock.saveFormLayout).toHaveBeenCalledTimes(1);
  });

  it('calls saveLayout when expression is deleted', async () => {
    jest.spyOn(window, 'confirm').mockImplementation(() => true);
    const user = userEvent.setup();
    const expression: BooleanExpression = [GeneralRelationOperator.Equals, 1, 1];
    renderHiddenExpressionOnLayout({
      ...defaultLayouts,
      [layout1NameMock]: { ...layoutMock, hidden: expression },
    });
    const deleteExpressionButton = screen.getByRole('button', {
      name: textMock('right_menu.expression_delete'),
    });
    await act(() => user.click(deleteExpressionButton));
    expect(queriesMock.saveFormLayout).toHaveBeenCalledTimes(1);
  });
});

const renderHiddenExpressionOnLayout = (layouts = defaultLayouts) => {
  queryClientMock.setQueryData([QueryKey.FormLayouts, org, app, layoutSet], layouts);
  queryClientMock.setQueryData([QueryKey.DatamodelMetadata, org, app, layoutSet], []);
  return renderWithProviders(<HiddenExpressionOnLayout />);
};

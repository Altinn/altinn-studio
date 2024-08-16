import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../testing/mocks';
import { QueryKey } from 'app-shared/types/QueryKey';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';
import { HiddenExpressionOnLayout } from './HiddenExpressionOnLayout';
import type { IFormLayouts } from '../../../types/global';
import { layout1NameMock, layoutMock } from '@altinn/ux-editor/testing/layoutMock';
import { layoutSet1NameMock } from '@altinn/ux-editor/testing/layoutSetsMock';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { BooleanExpression } from '@studio/components';
import { GeneralRelationOperator } from '@studio/components';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { app, org } from '@studio/testing/testids';

// Test data
const layoutSet = layoutSet1NameMock;
const dataModelName = undefined;

const defaultLayouts: IFormLayouts = {
  [layout1NameMock]: layoutMock,
};

jest.mock('@studio/hooks/src/hooks/useDebounce.ts', () => ({
  useDebounce: jest.fn().mockReturnValue({
    debounce: jest.fn((fn) => fn()),
  }),
}));

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
    await user.click(addSubExpressionButton);

    expect(queriesMock.saveFormLayout).toHaveBeenCalledTimes(1);
    expect(queriesMock.saveFormLayout).toHaveBeenCalledWith(org, app, layout1NameMock, layoutSet, {
      componentIdsChange: undefined,
      layout: expect.objectContaining({
        data: expect.objectContaining({
          hidden: ['equals', 0, 0],
        }),
      }),
    });
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
    await user.click(editExpressionButton);
    const saveExpressionButton = screen.getByRole('button', {
      name: textMock('expression.saveAndClose'),
    });
    await user.click(saveExpressionButton);

    expect(queriesMock.saveFormLayout).toHaveBeenCalledTimes(1);
    expect(queriesMock.saveFormLayout).toHaveBeenCalledWith(org, app, layout1NameMock, layoutSet, {
      componentIdsChange: undefined,
      layout: expect.objectContaining({
        data: expect.objectContaining({
          hidden: expression,
        }),
      }),
    });
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
    await user.click(deleteExpressionButton);
    expect(queriesMock.saveFormLayout).toHaveBeenCalledTimes(1);
  });
});

const renderHiddenExpressionOnLayout = (layouts = defaultLayouts) => {
  queryClientMock.setQueryData([QueryKey.FormLayouts, org, app, layoutSet], layouts);
  queryClientMock.setQueryData(
    [QueryKey.DataModelMetadata, org, app, layoutSet, dataModelName],
    [],
  );
  return renderWithProviders(<HiddenExpressionOnLayout />);
};

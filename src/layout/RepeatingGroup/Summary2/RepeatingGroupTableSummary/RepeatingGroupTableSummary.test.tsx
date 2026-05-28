import React from 'react';

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { defaultDataTypeMock } from 'src/__mocks__/getLayoutSetsMock';
import { ALTINN_ROW_ID } from 'src/features/formData/types';
import * as deepValidationsForNodeModule from 'src/features/validation/selectors/deepValidationsForNode';
import * as useNavigatePageModule from 'src/hooks/useNavigatePage';
import { RepeatingGroupProvider } from 'src/layout/RepeatingGroup/Providers/RepeatingGroupContext';
import { RepeatingGroupTableSummary } from 'src/layout/RepeatingGroup/Summary2/RepeatingGroupTableSummary/RepeatingGroupTableSummary';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import type { ExprVal, ExprValToActualOrExpr } from 'src/features/expressions/types';
import type { ILayoutCollection } from 'src/layout/layout';

type NodeId = 'input1' | 'input2' | 'input3' | 'repeating-group';

interface LayoutOptions {
  hidden?: NodeId[];
  readOnly?: Record<string, ExprValToActualOrExpr<ExprVal.Boolean>>;
  editButton?: boolean;
  withRowsBefore?: boolean;
  withRowsAfter?: boolean;
  tableHeaders?: string[];
}

describe('RepeatingGroupTableSummary', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const createLayout = ({
    hidden = [],
    readOnly = {},
    editButton,
    withRowsBefore,
    withRowsAfter,
    tableHeaders = ['input3'],
  }: LayoutOptions = {}): ILayoutCollection => ({
    FormPage1: {
      data: {
        layout: [
          {
            id: 'repeating-group',
            type: 'RepeatingGroup',
            dataModelBindings: {
              group: { dataType: defaultDataTypeMock, field: 'group' },
            },
            tableHeaders,
            children: ['input1', 'input2', 'input3'],
            maxCount: 3,
            hidden: hidden.includes('repeating-group'),
            ...(withRowsBefore && {
              rowsBefore: [
                {
                  cells: [{ text: 'summary.before' }],
                },
              ],
            }),
            ...(withRowsAfter && {
              rowsAfter: [
                {
                  cells: [{ text: 'summary.total' }],
                },
              ],
            }),
            ...(editButton !== undefined && {
              edit: {
                editButton,
              },
            }),
          },
          {
            id: 'input1',
            type: 'Input',
            dataModelBindings: {
              simpleBinding: { dataType: defaultDataTypeMock, field: 'group.field1' },
            },
            textResourceBindings: {
              title: 'Input 1',
            },
            hidden: hidden.includes('input1'),
            ...(readOnly['input1'] !== undefined && { readOnly: readOnly['input1'] }),
          },
          {
            id: 'input2',
            type: 'Input',
            dataModelBindings: {
              simpleBinding: { dataType: defaultDataTypeMock, field: 'group.field2' },
            },
            textResourceBindings: {
              title: 'Input 2',
            },
            hidden: hidden.includes('input2'),
            ...(readOnly['input2'] !== undefined && { readOnly: readOnly['input2'] }),
          },
          {
            id: 'input3',
            type: 'Input',
            dataModelBindings: {
              simpleBinding: { dataType: defaultDataTypeMock, field: 'group.field3' },
            },
            textResourceBindings: {
              title: 'Input 3',
            },
            hidden: hidden.includes('input3'),
            ...(readOnly['input3'] !== undefined && { readOnly: readOnly['input3'] }),
          },
        ],
      },
    },
    FormPage2: {
      data: {
        layout: [
          {
            id: 'summary2',
            type: 'Summary2',
            target: {
              type: 'component',
              id: 'repeating-group',
            },
            overrides: [{ componentType: 'RepeatingGroup', display: 'table' }],
          },
        ],
      },
    },
  });

  const layoutWithNestedGroupChild = (): ILayoutCollection => ({
    FormPage1: {
      data: {
        layout: [
          {
            id: 'repeating-group',
            type: 'RepeatingGroup',
            dataModelBindings: {
              group: { dataType: defaultDataTypeMock, field: 'group' },
            },
            children: ['inner-group'],
            tableHeaders: ['nested-input'],
            maxCount: 3,
            edit: {
              editButton: true,
            },
          },
          {
            id: 'inner-group',
            type: 'Group',
            children: ['nested-input'],
          },
          {
            id: 'nested-input',
            type: 'Input',
            dataModelBindings: {
              simpleBinding: { dataType: defaultDataTypeMock, field: 'group.nestedField' },
            },
            textResourceBindings: {
              title: 'Nested input',
            },
          },
        ],
      },
    },
    FormPage2: {
      data: {
        layout: [
          {
            id: 'summary2',
            type: 'Summary2',
            target: {
              type: 'component',
              id: 'repeating-group',
            },
            overrides: [{ componentType: 'RepeatingGroup', display: 'table' }],
          },
        ],
      },
    },
  });

  test('should focus the first input when clicking the edit button', async () => {
    const user = userEvent.setup();
    const navigate = jest.fn();
    await render({ navigate });

    // Find the edit button and click it
    const editButton = screen.getByRole('button', { name: /endre/i });
    await user.click(editButton);

    // Expect the third input to be navigated to, as that is in tableHeaders
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('input3-0', 'input3', expect.any(Object)));
  });

  test('should focus the next input when the first input is hidden', async () => {
    const user = userEvent.setup();
    const navigate = jest.fn();
    await render({ navigate, layout: createLayout({ hidden: ['input3'] }) });

    // Find the edit button and click it
    const editButton = screen.getByRole('button', { name: /endre/i });
    await user.click(editButton);

    // Expect the next input (after input3) to be navigated to
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('input1-0', 'input1', expect.any(Object)));
  });

  test('should focus the last input when the other two are hidden', async () => {
    const user = userEvent.setup();
    const navigate = jest.fn();
    await render({ navigate, layout: createLayout({ hidden: ['input3', 'input1'] }) });

    // Find the edit button and click it
    const editButton = screen.getByRole('button', { name: /endre/i });
    await user.click(editButton);

    // Expect the last input to be navigated to
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('input2-0', 'input2', expect.any(Object)));
  });

  test('should focus the repeating group itself when all inputs are hidden', async () => {
    const user = userEvent.setup();
    const navigate = jest.fn();
    await render({ navigate, layout: createLayout({ hidden: ['input1', 'input2', 'input3'] }) });

    // Find the edit button and click it
    const editButton = screen.getByRole('button', { name: /endre/i });
    await user.click(editButton);

    // Expect the repeating group to be navigated to
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith('repeating-group', 'repeating-group', expect.any(Object)),
    );
  });

  test('should not render edit button when edit.editButton is false', async () => {
    await render({ layout: createLayout({ editButton: false }) });
    expect(screen.queryByRole('button', { name: /endre/i })).not.toBeInTheDocument();
  });

  test('should render edit button when edit.editButton is true', async () => {
    await render({ layout: createLayout({ editButton: true }) });
    expect(screen.getByRole('button', { name: /endre/i })).toBeInTheDocument();
  });

  test('should render rowsAfter in summary table', async () => {
    await render({ layout: createLayout({ editButton: true, withRowsAfter: true }) });
    expect(screen.getByText('summary.total')).toBeInTheDocument();
  });

  test('should render rowsBefore in summary table', async () => {
    await render({ layout: createLayout({ editButton: true, withRowsBefore: true }) });
    expect(screen.getByText('summary.before')).toBeInTheDocument();
  });

  test('should handle nested child component inside group when editing', async () => {
    const user = userEvent.setup();
    const navigate = jest.fn();
    await render({ navigate, layout: layoutWithNestedGroupChild() });

    const editButton = screen.getByRole('button', { name: /endre/i });
    await user.click(editButton);

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith('repeating-group', 'repeating-group', expect.any(Object)),
    );
  });

  test('should show edit button when a readOnly field precedes editable fields', async () => {
    await render({ layout: createLayout({ editButton: true, readOnly: { input1: true } }) });
    expect(screen.getByRole('button', { name: /endre/i })).toBeInTheDocument();
  });

  test('should navigate to first editable (non-readOnly) field on edit click', async () => {
    const user = userEvent.setup();
    const navigate = jest.fn();
    await render({
      navigate,
      layout: createLayout({ editButton: true, tableHeaders: ['input1'], readOnly: { input1: true } }),
    });

    const editButton = screen.getByRole('button', { name: /endre/i });
    await user.click(editButton);

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('input2-0', 'input2', expect.any(Object)));
  });

  test('should navigate to first editable field when readOnly is an expression that evaluates to true', async () => {
    const user = userEvent.setup();
    const navigate = jest.fn();
    await render({
      navigate,
      layout: createLayout({
        editButton: true,
        tableHeaders: ['input1'],
        readOnly: { input1: ['equals', true, true] },
      }),
    });

    const editButton = screen.getByRole('button', { name: /endre/i });
    await user.click(editButton);

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('input2-0', 'input2', expect.any(Object)));
  });

  test('should navigate to repeating group when all fields are readOnly', async () => {
    const user = userEvent.setup();
    const navigate = jest.fn();
    await render({
      navigate,
      layout: createLayout({ editButton: true, readOnly: { input1: true, input2: true, input3: true } }),
    });

    const editButton = screen.getByRole('button', { name: /endre/i });
    await user.click(editButton);

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith('repeating-group', 'repeating-group', expect.any(Object)),
    );
  });

  test('should render row error in matching column cell', async () => {
    jest
      .spyOn(deepValidationsForNodeModule, 'useDeepValidationsForNode')
      .mockImplementation((_baseComponentId, _includeSelf, restriction) =>
        restriction === 0
          ? ([
              {
                severity: 'error',
                baseComponentId: 'input2',
                message: { key: 'Error.for.input2' },
              },
            ] as never)
          : ([] as never),
      );
    await render({ layout: createLayout({ tableHeaders: ['input1', 'input2', 'input3'] }) });
    const errorMessage = screen.getByText('Error.for.input2');
    expect(errorMessage.closest('td')).toHaveAttribute('data-header-title', 'Input 2');
  });

  test('should render unmapped row error in first visible column cell', async () => {
    jest
      .spyOn(deepValidationsForNodeModule, 'useDeepValidationsForNode')
      .mockImplementation((_baseComponentId, _includeSelf, restriction) =>
        restriction === 0
          ? ([
              {
                severity: 'error',
                baseComponentId: undefined,
                message: { key: 'Error.unmapped' },
              },
            ] as never)
          : ([] as never),
      );
    await render({ layout: createLayout({ tableHeaders: ['input1', 'input2', 'input3'] }) });
    const errorMessage = screen.getByText('Error.unmapped');
    expect(errorMessage.closest('td')).toHaveAttribute('data-header-title', 'Input 1');
  });

  type IRenderProps = {
    navigate?: jest.Mock;
    layout?: ILayoutCollection;
  };

  const render = async ({ navigate, layout = createLayout() }: IRenderProps = {}) => {
    if (navigate) {
      jest.spyOn(useNavigatePageModule, 'useNavigateToComponent').mockReturnValue(navigate);
    }

    return await renderWithInstanceAndLayout({
      renderer: (
        <RepeatingGroupProvider baseComponentId='repeating-group'>
          <RepeatingGroupTableSummary baseComponentId='repeating-group' />
        </RepeatingGroupProvider>
      ),
      initialPage: 'FormPage2',
      queries: {
        fetchLayouts: async () => layout,
        fetchFormData: async () => ({
          group: [{ field1: 'field1-row0', field2: 'field2-row0', field3: 'field3-row0', [ALTINN_ROW_ID]: 'abc123' }],
        }),
        fetchLayoutSettings: async () => ({
          pages: {
            order: ['FormPage1', 'FormPage2'],
          },
        }),
      },
    });
  };
});

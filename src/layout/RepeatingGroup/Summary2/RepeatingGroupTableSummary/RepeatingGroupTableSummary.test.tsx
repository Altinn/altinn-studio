import React, { PropsWithChildren } from 'react';

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { defaultDataTypeMock } from 'src/__mocks__/getLayoutSetsMock';
import { useRegisterNavigationHandler } from 'src/features/form/layout/NavigateToNode';
import { ALTINN_ROW_ID } from 'src/features/formData/types';
import { RepeatingGroupProvider } from 'src/layout/RepeatingGroup/Providers/RepeatingGroupContext';
import { RepeatingGroupTableSummary } from 'src/layout/RepeatingGroup/Summary2/RepeatingGroupTableSummary/RepeatingGroupTableSummary';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import type { ILayoutCollection } from 'src/layout/layout';

type NodeId = 'input1' | 'input2' | 'input3' | 'repeating-group';

describe('RepeatingGroupTableSummary', () => {
  const layoutWithHidden = (hidden: NodeId[]): ILayoutCollection => ({
    FormPage1: {
      data: {
        layout: [
          {
            id: 'repeating-group',
            type: 'RepeatingGroup',
            dataModelBindings: {
              group: { dataType: defaultDataTypeMock, field: 'group' },
            },
            tableHeaders: ['input3'],
            children: ['input1', 'input2', 'input3'],
            maxCount: 3,
            hidden: hidden.includes('repeating-group'),
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
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('input3-0'));
  });

  test('should focus the next input when the first input is hidden', async () => {
    const user = userEvent.setup();
    const navigate = jest.fn();
    await render({ navigate, layout: layoutWithHidden(['input3']) });

    // Find the edit button and click it
    const editButton = screen.getByRole('button', { name: /endre/i });
    await user.click(editButton);

    // Expect the next input (after input3) to be navigated to
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('input1-0'));
  });

  test('should focus the last input when the other two are hidden', async () => {
    const user = userEvent.setup();
    const navigate = jest.fn();
    await render({ navigate, layout: layoutWithHidden(['input3', 'input1']) });

    // Find the edit button and click it
    const editButton = screen.getByRole('button', { name: /endre/i });
    await user.click(editButton);

    // Expect the last input to be navigated to
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('input2-0'));
  });

  test('should focus the repeating group itself when all inputs are hidden', async () => {
    const user = userEvent.setup();
    const navigate = jest.fn();
    await render({ navigate, layout: layoutWithHidden(['input1', 'input2', 'input3']) });

    // Find the edit button and click it
    const editButton = screen.getByRole('button', { name: /endre/i });
    await user.click(editButton);

    // Expect the repeating group to be navigated to
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('repeating-group'));
  });

  function NavigationHook({ fn, children }: PropsWithChildren<{ fn: jest.Mock }>) {
    useRegisterNavigationHandler((indexedId, _baseComponentId, _options) => fn(indexedId));
    return children;
  }

  type IRenderProps = {
    navigate?: jest.Mock;
    layout?: ILayoutCollection;
  };

  const render = async ({ navigate = jest.fn(), layout = layoutWithHidden([]) }: IRenderProps = {}) =>
    await renderWithInstanceAndLayout({
      renderer: (
        <NavigationHook fn={navigate}>
          <RepeatingGroupProvider baseComponentId='repeating-group'>
            <RepeatingGroupTableSummary baseComponentId='repeating-group' />
          </RepeatingGroupProvider>
        </NavigationHook>
      ),
      initialPage: 'FormPage2',
      queries: {
        fetchLayouts: async () => layout,
        fetchFormData: async () => ({
          group: [{ field1: 'field1-row0', field2: 'field2-row0', field3: 'field3-row0', [ALTINN_ROW_ID]: 'abc123' }],
        }),
      },
    });
});

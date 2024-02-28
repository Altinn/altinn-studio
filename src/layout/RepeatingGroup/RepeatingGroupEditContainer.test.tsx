import React from 'react';

import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { getMultiPageGroupMock } from 'src/__mocks__/getMultiPageGroupMock';
import { ALTINN_ROW_ID } from 'src/features/formData/types';
import {
  RepeatingGroupProvider,
  useRepeatingGroup,
  useRepeatingGroupSelector,
} from 'src/layout/RepeatingGroup/RepeatingGroupContext';
import { RepeatingGroupsEditContainer } from 'src/layout/RepeatingGroup/RepeatingGroupsEditContainer';
import { renderWithNode } from 'src/test/renderWithProviders';
import type { CompCheckboxesExternal } from 'src/layout/Checkboxes/config.generated';
import type { IRawOption } from 'src/layout/common.generated';
import type { CompExternal } from 'src/layout/layout';
import type { CompRepeatingGroupInternal } from 'src/layout/RepeatingGroup/config.generated';
import type { BaseLayoutNode } from 'src/utils/layout/LayoutNode';

describe('RepeatingGroupsEditContainer', () => {
  const options: IRawOption[] = [{ value: 'option.value', label: 'option.label' }];
  const components: CompExternal[] = [
    {
      id: 'field1',
      type: 'Input',
      dataModelBindings: {
        simpleBinding: 'Group.prop1',
      },
      textResourceBindings: {
        title: 'Title1',
      },
      readOnly: false,
      required: false,
    },
    {
      id: 'field2',
      type: 'Input',
      dataModelBindings: {
        simpleBinding: 'Group.prop2',
      },
      textResourceBindings: {
        title: 'Title2',
      },
      readOnly: false,
      required: false,
    },
    {
      id: 'field3',
      type: 'Input',
      dataModelBindings: {
        simpleBinding: 'Group.prop3',
      },
      textResourceBindings: {
        title: 'Title3',
      },
      readOnly: false,
      required: false,
    },
    {
      id: 'field4',
      type: 'Checkboxes',
      dataModelBindings: {
        simpleBinding: 'some-group.checkboxBinding',
      },
      textResourceBindings: {
        title: 'Title4',
      },
      readOnly: false,
      required: false,
      disabled: false,
      options,
    } as CompCheckboxesExternal,
  ];

  it('Moves to next row when "save and open next" is pressed', async () => {
    await render();
    expect(screen.getByTestId('editingIndex')).toHaveTextContent('undefined');
    await userEvent.click(screen.getByRole('button', { name: /Open first row/i }));
    expect(screen.getByTestId('editingIndex')).toHaveTextContent('0');
    await userEvent.click(screen.getByRole('button', { name: /Lagre og åpne neste/i }));
    expect(screen.getByTestId('editingIndex')).toHaveTextContent('1');
  });

  const render = async () => {
    const multiPageGroup = getMultiPageGroupMock({ id: 'group' });
    multiPageGroup.edit!.saveAndNextButton = true;

    return await renderWithNode<true, BaseLayoutNode<CompRepeatingGroupInternal>>({
      nodeId: 'group',
      inInstance: true,
      renderer: ({ node }) => (
        <RepeatingGroupProvider node={node}>
          <TestRenderer />
        </RepeatingGroupProvider>
      ),
      queries: {
        fetchLayouts: async () => ({
          FormLayout: {
            data: {
              layout: [multiPageGroup, ...components],
            },
          },
        }),
        fetchTextResources: async () => ({
          language: 'en',
          resources: [
            {
              id: 'option.label',
              value: 'Value to be shown',
            },
          ],
        }),
        fetchFormData: async () => ({
          multipageGroup: [
            {
              [ALTINN_ROW_ID]: 'abc123',
              prop1: 'prop1',
              prop2: 'prop2',
              prop3: 'prop3',
            },
            {
              [ALTINN_ROW_ID]: 'def456',
              prop1: 'prop4',
              prop2: 'prop5',
              prop3: 'prop6',
            },
          ],
        }),
      },
    });
  };
});

function TestRenderer() {
  const editingId = useRepeatingGroupSelector((state) => state.editingId);
  const { visibleRows } = useRepeatingGroup();
  const editingIndex = visibleRows.find((r) => r.uuid === editingId)?.index;
  const { openForEditing } = useRepeatingGroup();

  if (editingIndex === undefined || editingId === undefined) {
    return (
      <>
        <div data-testid='editingIndex'>undefined</div>
        <button onClick={() => openForEditing(visibleRows[0].uuid)}>Open first row</button>
      </>
    );
  }

  return (
    <>
      <div data-testid='editingIndex'>{editingIndex}</div>
      <RepeatingGroupsEditContainer editId={editingId} />
    </>
  );
}

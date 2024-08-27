import React from 'react';

import { afterAll, beforeAll, jest } from '@jest/globals';
import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { FD } from 'src/features/formData/FormDataWrite';
import { ALTINN_ROW_ID } from 'src/features/formData/types';
import {
  RepeatingGroupProvider,
  useRepeatingGroup,
  useRepeatingGroupRowState,
  useRepeatingGroupSelector,
} from 'src/layout/RepeatingGroup/RepeatingGroupContext';
import { renderWithNode } from 'src/test/renderWithProviders';
import type { JsonPatch } from 'src/features/formData/jsonPatch/types';
import type { ILayout } from 'src/layout/layout';
import type { CompRepeatingGroupExternal } from 'src/layout/RepeatingGroup/config.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

// Mocking so that we can predict the UUIDs for new rows
const nextUuids: string[] = [];
jest.mock('uuid', () => ({
  v4: () => {
    if (nextUuids.length === 0) {
      throw new Error('No more UUIDs');
    }
    return nextUuids.shift()!;
  },
}));

describe('openByDefault', () => {
  function RenderTest() {
    const state = useRepeatingGroupSelector((state) => ({
      editingId: state.editingId,
      addingIds: state.addingIds,
    }));
    const { deleteRow } = useRepeatingGroup();
    const { visibleRows, hiddenRows } = useRepeatingGroupRowState();

    const data = FD.useDebouncedPick('MyGroup');
    return (
      <>
        <div data-testid='state'>
          {JSON.stringify({
            ...state,
            visibleRows: visibleRows.map((row) => row.index),
            hiddenRows: hiddenRows.map((row) => row.index),
            data,
          })}
        </div>
        <button
          onClick={() => {
            deleteRow(visibleRows[visibleRows.length - 1]);
          }}
        >
          Delete last visible row
        </button>
      </>
    );
  }

  interface Row {
    altinnRowId: string;
    id: number;
    name: string;
  }

  interface Props {
    existingRows?: Row[];
    edit?: Partial<CompRepeatingGroupExternal['edit']>;
    hiddenRow?: CompRepeatingGroupExternal['hiddenRow'];
  }

  function render({ existingRows, edit, hiddenRow }: Props) {
    const layout: ILayout = [
      {
        id: 'myGroup',
        type: 'RepeatingGroup',
        dataModelBindings: {
          group: 'MyGroup',
        },
        children: ['name'],
        edit: {
          ...edit,
        },
        hiddenRow,
      },
      {
        id: 'name',
        type: 'Input',
        dataModelBindings: {
          simpleBinding: 'MyGroup.name',
        },
        showValidations: [],
      },
    ];

    return renderWithNode<true, LayoutNode<'RepeatingGroup'>>({
      renderer: ({ node }) => (
        <RepeatingGroupProvider node={node}>
          <RenderTest />
        </RepeatingGroupProvider>
      ),
      nodeId: 'myGroup',
      inInstance: true,
      queries: {
        fetchFormData: async () => ({
          MyGroup: existingRows ?? [],
        }),
        fetchLayouts: async () => ({
          FormLayout: {
            data: { layout },
          },
        }),
      },
    });
  }

  function getState() {
    const json = screen.getByTestId('state').textContent;
    return JSON.parse(json!);
  }

  interface WaitForStateProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    state: any;
    mutations: Awaited<ReturnType<typeof render>>['mutations'];
    expectedPatch?: JsonPatch;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    newModelAfterSave?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expectedWarning?: any;
  }

  async function waitUntil({ state, mutations, expectedPatch, newModelAfterSave, expectedWarning }: WaitForStateProps) {
    jest.advanceTimersByTime(3000);
    if (newModelAfterSave && mutations) {
      await waitFor(() => expect(mutations.doPatchFormData.mock).toHaveBeenCalledTimes(1));

      expect(mutations.doPatchFormData.mock).toHaveBeenCalledWith(
        expect.anything(),
        expectedPatch ? expect.objectContaining({ patch: expectedPatch }) : expect.anything(),
      );
      mutations.doPatchFormData.resolve({
        validationIssues: {},
        newDataModel: newModelAfterSave,
      });
      (mutations.doPatchFormData.mock as jest.Mock).mockClear();
    }

    // Ensure state is as expected
    await waitFor(() => expect(getState()).toEqual(state));

    // Because this typically happens in a loop, we need to wait a little more and check again to make sure
    // the state doesn't change again.
    jest.advanceTimersByTime(3000);
    jest.useRealTimers();
    await new Promise((resolve) => setTimeout(resolve, 300));
    jest.useFakeTimers();
    expect(getState()).toEqual(state);
    expect(mutations?.doPatchFormData.mock).not.toHaveBeenCalled();

    if (expectedWarning) {
      expect(window.logWarn).toHaveBeenCalledWith(expectedWarning);
    } else {
      expect(window.logWarn).not.toHaveBeenCalled();
    }
  }

  beforeAll(() => {
    jest.useFakeTimers();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest
      .spyOn(window, 'logWarn')
      .mockImplementation(() => {})
      .mockName('window.logWarn');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('should not add a new row by default when off', async () => {
    const { mutations } = await render({
      existingRows: [],
      edit: { openByDefault: false },
    });

    await waitUntil({
      state: {
        editingId: undefined,
        addingIds: [],
        visibleRows: [],
        hiddenRows: [],
        data: [],
      },
      mutations,
    });
  });

  it('should add one new row by default when on', async () => {
    nextUuids.push('abc123');
    const { mutations } = await render({
      existingRows: [],
      edit: { openByDefault: true },
    });
    await waitUntil({
      state: {
        editingId: 'abc123',
        addingIds: [],
        visibleRows: [0],
        hiddenRows: [],
        data: [{ [ALTINN_ROW_ID]: 'abc123', id: 1, name: 'test' }],
      },
      expectedPatch: [
        { op: 'test', path: '/MyGroup', value: [] },
        { op: 'add', path: '/MyGroup/-', value: { [ALTINN_ROW_ID]: 'abc123' } },
      ],
      newModelAfterSave: {
        MyGroup: [{ [ALTINN_ROW_ID]: 'abc123', id: 1, name: 'test' }],
      },
      mutations,
    });
  });

  it('should not add a new row if one already exists', async () => {
    const { mutations } = await render({
      existingRows: [{ [ALTINN_ROW_ID]: 'abc123', id: 1, name: 'test' }],
      edit: { openByDefault: true },
    });

    await waitUntil({
      state: {
        editingId: undefined,
        addingIds: [],
        visibleRows: [0],
        hiddenRows: [],
        data: [
          {
            [ALTINN_ROW_ID]: expect.any(String),
            id: 1,
            name: 'test',
          },
        ],
      },
      mutations,
    });
  });

  it.each(['first', 'last'] as const)(
    'should open the row if one exist and openByDefault is %s',
    async (openByDefault) => {
      const { mutations } = await render({
        existingRows: [{ [ALTINN_ROW_ID]: 'def456', id: 1, name: 'test' }],
        edit: { openByDefault },
      });

      await waitUntil({
        state: {
          editingId: 'def456',
          addingIds: [],
          visibleRows: [0],
          hiddenRows: [],
          data: [
            {
              [ALTINN_ROW_ID]: 'def456',
              id: 1,
              name: 'test',
            },
          ],
        },
        mutations,
      });
    },
  );

  it.each(['first', 'last'] as const)(
    'should add the first row if none exists and openByDefault is %s',
    async (openByDefault) => {
      nextUuids.push('abc123-def456');
      const { mutations } = await render({
        existingRows: [],
        edit: { openByDefault },
      });

      await waitUntil({
        state: {
          editingId: 'abc123-def456',
          addingIds: [],
          visibleRows: [0],
          hiddenRows: [],
          data: [
            {
              [ALTINN_ROW_ID]: 'abc123-def456',
              id: 5,
              name: 'foo bar',
            },
          ],
        },
        expectedPatch: [
          { op: 'test', path: '/MyGroup', value: [] },
          { op: 'add', path: '/MyGroup/-', value: { [ALTINN_ROW_ID]: 'abc123-def456' } },
        ],
        newModelAfterSave: {
          MyGroup: [{ [ALTINN_ROW_ID]: 'abc123-def456', id: 5, name: 'foo bar' }],
        },
        mutations,
      });
    },
  );

  it.each(['first', 'last'] as const)(
    'should not add a new row if one already exists and openByDefault is %s',
    async (openByDefault) => {
      const { mutations } = await render({
        existingRows: [{ [ALTINN_ROW_ID]: 'cba321', id: 1, name: 'test' }],
        edit: { openByDefault },
      });

      await waitUntil({
        state: {
          editingId: 'cba321',
          addingIds: [],
          visibleRows: [0],
          hiddenRows: [],
          data: [{ [ALTINN_ROW_ID]: 'cba321', id: 1, name: 'test' }],
        },
        mutations,
      });
    },
  );

  it.each(['first', 'last'] as const)(
    'should open the correct row if multiple exist and openByDefault is %s',
    async (openByDefault) => {
      const { mutations } = await render({
        existingRows: [
          { [ALTINN_ROW_ID]: 'a1', id: 1, name: 'test' },
          { [ALTINN_ROW_ID]: 'a2', id: 2, name: 'test' },
        ],
        edit: { openByDefault },
      });

      await waitUntil({
        state: {
          editingId: openByDefault === 'last' ? 'a2' : 'a1',
          addingIds: [],
          visibleRows: [0, 1],
          hiddenRows: [],
          data: [
            { [ALTINN_ROW_ID]: 'a1', id: 1, name: 'test' },
            { [ALTINN_ROW_ID]: 'a2', id: 2, name: 'test' },
          ],
        },
        mutations,
      });
    },
  );

  it.each(['first', 'last', true] as const)(
    'should add a new row if one already exists but is hidden, and openByDefault is %s',
    async (openByDefault) => {
      nextUuids.push('c3-2');
      const { mutations } = await render({
        existingRows: [{ [ALTINN_ROW_ID]: 'c3', id: 1, name: 'test' }],
        edit: { openByDefault },
        hiddenRow: ['equals', ['dataModel', 'MyGroup.name'], 'test'],
      });

      await waitUntil({
        state: {
          editingId: 'c3-2',
          addingIds: [],
          visibleRows: [1],
          hiddenRows: [0],
          data: [
            { [ALTINN_ROW_ID]: 'c3', id: 1, name: 'test' },
            { [ALTINN_ROW_ID]: 'c3-2', id: 2, name: 'bar baz' },
          ],
        },
        expectedPatch: [
          { op: 'test', path: '/MyGroup', value: [{ [ALTINN_ROW_ID]: 'c3', id: 1, name: 'test' }] },
          { op: 'add', path: '/MyGroup/-', value: { [ALTINN_ROW_ID]: 'c3-2' } },
        ],
        newModelAfterSave: {
          MyGroup: [
            { [ALTINN_ROW_ID]: 'c3', id: 1, name: 'test' },
            { [ALTINN_ROW_ID]: 'c3-2', id: 2, name: 'bar baz' },
          ],
        },
        mutations,
      });
    },
  );

  it.each(['first', 'last', true] as const)(
    'should only attempt to add one new row if new rows keep getting hidden, and openByDefault is %s',
    async (openByDefault) => {
      nextUuids.push('d5-2');
      const { mutations } = await render({
        existingRows: [{ [ALTINN_ROW_ID]: 'd5', id: 1, name: 'test' }],
        edit: { openByDefault },
        hiddenRow: ['equals', true, true],
      });

      // This should fail, because the new row we add is hidden. It's too late when we've already added it, so we
      // can't do anything about it, but a warning is logged.
      await waitUntil({
        state: {
          editingId: undefined,
          addingIds: [],
          visibleRows: [],
          hiddenRows: [0, 1],
          data: [
            { [ALTINN_ROW_ID]: 'd5', id: 1, name: 'test' },
            { [ALTINN_ROW_ID]: 'd5-2', id: 2, name: 'test' },
          ],
        },
        expectedPatch: [
          { op: 'test', path: '/MyGroup', value: [{ [ALTINN_ROW_ID]: 'd5', id: 1, name: 'test' }] },
          { op: 'add', path: '/MyGroup/-', value: { [ALTINN_ROW_ID]: 'd5-2' } },
        ],
        newModelAfterSave: {
          MyGroup: [
            { [ALTINN_ROW_ID]: 'd5', id: 1, name: 'test' },
            { [ALTINN_ROW_ID]: 'd5-2', id: 2, name: 'test' },
          ],
        },
        expectedWarning: expect.stringContaining(
          "openByDefault for repeating group 'myGroup' returned 'addedAndHidden'",
        ),
        mutations,
      });

      expect(window.logWarn).toHaveBeenCalledTimes(1);
    },
  );

  it.each(['first', 'last', true] as const)(
    'should immediately hide the row again, but not create a new one if the backend ' +
      'responds with prefill that makes the new row hidden again, and openByDefault is %s',
    async (openByDefault) => {
      nextUuids.push('e6-2');
      const { mutations } = await render({
        existingRows: [{ [ALTINN_ROW_ID]: 'e6', id: 1, name: 'test' }],
        edit: { openByDefault },
        hiddenRow: ['equals', ['dataModel', 'MyGroup.name'], 'test'],
      });

      await waitUntil({
        state: {
          editingId: undefined,
          addingIds: [],
          visibleRows: [],
          hiddenRows: [0, 1],
          data: [
            { [ALTINN_ROW_ID]: 'e6', id: 1, name: 'test' },
            { [ALTINN_ROW_ID]: 'e6-2', id: 2, name: 'test' },
          ],
        },
        expectedPatch: [
          { op: 'test', path: '/MyGroup', value: [{ [ALTINN_ROW_ID]: 'e6', id: 1, name: 'test' }] },
          { op: 'add', path: '/MyGroup/-', value: { [ALTINN_ROW_ID]: 'e6-2' } },
        ],
        newModelAfterSave: {
          MyGroup: [
            { [ALTINN_ROW_ID]: 'e6', id: 1, name: 'test' },
            { [ALTINN_ROW_ID]: 'e6-2', id: 2, name: 'test' },
          ],
        },
        mutations,
        expectedWarning: expect.stringContaining(
          "openByDefault for repeating group 'myGroup' returned 'addedAndHidden'",
        ),
      });
    },
  );

  it('should not add rows if not allowed to', async () => {
    const { mutations } = await render({
      existingRows: [],
      edit: { openByDefault: true, addButton: false },
    });

    await waitUntil({
      state: {
        editingId: undefined,
        addingIds: [],
        visibleRows: [],
        hiddenRows: [],
        data: [],
      },
      mutations,
    });
  });

  it.each(['first', 'last', true] as const)(
    'should not add a new row if the last one is deleted and openByDefault is %s',
    async (openByDefault) => {
      const user = userEvent.setup({ delay: null });
      const { mutations } = await render({
        existingRows: [{ [ALTINN_ROW_ID]: 'f7', id: 1, name: 'test' }],
        edit: { openByDefault },
      });

      await waitUntil({
        state: {
          editingId: openByDefault === true ? undefined : 'f7',
          addingIds: [],
          visibleRows: [0],
          hiddenRows: [],
          data: [{ [ALTINN_ROW_ID]: 'f7', id: 1, name: 'test' }],
        },
        mutations,
      });

      await user.click(screen.getByText('Delete last visible row'));

      await waitUntil({
        state: {
          editingId: undefined,
          addingIds: [],
          visibleRows: [],
          hiddenRows: [],
          data: [],
        },
        expectedPatch: [
          { op: 'test', path: '/MyGroup', value: [{ [ALTINN_ROW_ID]: 'f7', id: 1, name: 'test' }] },
          { op: 'remove', path: '/MyGroup/0' },
        ],
        newModelAfterSave: { MyGroup: [] },
        mutations,
      });
    },
  );
});

import React from 'react';

import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { FD } from 'src/features/formData/FormDataWrite';
import {
  RepeatingGroupProvider,
  useRepeatingGroup,
  useRepeatingGroupSelector,
} from 'src/layout/RepeatingGroup/RepeatingGroupContext';
import { renderWithNode } from 'src/test/renderWithProviders';
import type { JsonPatch } from 'src/features/formData/jsonPatch/types';
import type { ILayout } from 'src/layout/layout';
import type {
  CompRepeatingGroupExternal,
  CompRepeatingGroupInternal,
} from 'src/layout/RepeatingGroup/config.generated';
import type { BaseLayoutNode } from 'src/utils/layout/LayoutNode';

describe('openByDefault', () => {
  function RenderTest() {
    const state = useRepeatingGroupSelector((state) => ({
      editingIndex: state.editingIndex,
      addingIndexes: state.addingIndexes,
    }));
    const { deleteRow, visibleRowIndexes, hiddenRowIndexes } = useRepeatingGroup();

    const data = FD.useDebouncedPick('MyGroup');
    return (
      <>
        <div data-testid='state'>
          {JSON.stringify({
            ...state,
            visibleRowIndexes,
            hiddenRowIndexes: [...hiddenRowIndexes.values()],
            data,
          })}
        </div>
        <button
          onClick={() => {
            deleteRow(visibleRowIndexes[visibleRowIndexes.length - 1]);
          }}
        >
          Delete last visible row
        </button>
      </>
    );
  }

  interface Row {
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
      },
    ];

    return renderWithNode<true, BaseLayoutNode<CompRepeatingGroupInternal>>({
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
    state: any;
    mutations: Awaited<ReturnType<typeof render>>['mutations'];
    expectedPatch?: JsonPatch;
    newModelAfterSave?: any;
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
        editingIndex: undefined,
        addingIndexes: [],
        visibleRowIndexes: [],
        hiddenRowIndexes: [],
        data: [],
      },
      mutations,
    });
  });

  it('should add one new row by default when on', async () => {
    const { mutations } = await render({
      existingRows: [],
      edit: { openByDefault: true },
    });
    await waitUntil({
      state: {
        editingIndex: 0,
        addingIndexes: [],
        visibleRowIndexes: [0],
        hiddenRowIndexes: [],
        data: [{ id: 1, name: 'test' }],
      },
      expectedPatch: [
        { op: 'test', path: '/MyGroup', value: [] },
        { op: 'add', path: '/MyGroup/-', value: {} },
      ],
      newModelAfterSave: { MyGroup: [{ id: 1, name: 'test' }] },
      mutations,
    });
  });

  it('should not add a new row if one already exists', async () => {
    const { mutations } = await render({
      existingRows: [{ id: 1, name: 'test' }],
      edit: { openByDefault: true },
    });

    await waitUntil({
      state: {
        editingIndex: undefined,
        addingIndexes: [],
        visibleRowIndexes: [0],
        hiddenRowIndexes: [],
        data: [{ id: 1, name: 'test' }],
      },
      mutations,
    });
  });

  it.each(['first', 'last'] as const)(
    'should open the row if one exist and openByDefault is %s',
    async (openByDefault) => {
      const { mutations } = await render({
        existingRows: [{ id: 1, name: 'test' }],
        edit: { openByDefault },
      });

      await waitUntil({
        state: {
          editingIndex: 0,
          addingIndexes: [],
          visibleRowIndexes: [0],
          hiddenRowIndexes: [],
          data: [{ id: 1, name: 'test' }],
        },
        mutations,
      });
    },
  );

  it.each(['first', 'last'] as const)(
    'should add the first row if none exists and openByDefault is %s',
    async (openByDefault) => {
      const { mutations } = await render({
        existingRows: [],
        edit: { openByDefault },
      });

      await waitUntil({
        state: {
          editingIndex: 0,
          addingIndexes: [],
          visibleRowIndexes: [0],
          hiddenRowIndexes: [],
          data: [{ id: 5, name: 'foo bar' }],
        },
        expectedPatch: [
          { op: 'test', path: '/MyGroup', value: [] },
          { op: 'add', path: '/MyGroup/-', value: {} },
        ],
        newModelAfterSave: { MyGroup: [{ id: 5, name: 'foo bar' }] },
        mutations,
      });
    },
  );

  it.each(['first', 'last'] as const)(
    'should not add a new row if one already exists and openByDefault is %s',
    async (openByDefault) => {
      const { mutations } = await render({
        existingRows: [{ id: 1, name: 'test' }],
        edit: { openByDefault },
      });

      await waitUntil({
        state: {
          editingIndex: 0,
          addingIndexes: [],
          visibleRowIndexes: [0],
          hiddenRowIndexes: [],
          data: [{ id: 1, name: 'test' }],
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
          { id: 1, name: 'test' },
          { id: 2, name: 'test' },
        ],
        edit: { openByDefault },
      });

      await waitUntil({
        state: {
          editingIndex: openByDefault === 'last' ? 1 : 0,
          addingIndexes: [],
          visibleRowIndexes: [0, 1],
          hiddenRowIndexes: [],
          data: [
            { id: 1, name: 'test' },
            { id: 2, name: 'test' },
          ],
        },
        mutations,
      });
    },
  );

  it.each(['first', 'last', true] as const)(
    'should add a new row if one already exists but is hidden, and openByDefault is %s',
    async (openByDefault) => {
      const { mutations } = await render({
        existingRows: [{ id: 1, name: 'test' }],
        edit: { openByDefault },
        hiddenRow: ['equals', ['dataModel', 'MyGroup.name'], 'test'],
      });

      await waitUntil({
        state: {
          editingIndex: 1,
          addingIndexes: [],
          visibleRowIndexes: [1],
          hiddenRowIndexes: [0],
          data: [
            { id: 1, name: 'test' },
            { id: 2, name: 'bar baz' },
          ],
        },
        expectedPatch: [
          { op: 'test', path: '/MyGroup', value: [{ id: 1, name: 'test' }] },
          { op: 'add', path: '/MyGroup/-', value: {} },
        ],
        newModelAfterSave: {
          MyGroup: [
            { id: 1, name: 'test' },
            { id: 2, name: 'bar baz' },
          ],
        },
        mutations,
      });
    },
  );

  it.each(['first', 'last', true] as const)(
    'should only attempt to add one new row if new rows keep getting hidden, and openByDefault is %s',
    async (openByDefault) => {
      const { mutations } = await render({
        existingRows: [{ id: 1, name: 'test' }],
        edit: { openByDefault },
        hiddenRow: ['equals', true, true],
      });

      // This should fail, because the new row we add is hidden. It's too late when we've already added it, so we
      // can't do anything about it, but a warning is logged.
      await waitUntil({
        state: {
          editingIndex: undefined,
          addingIndexes: [],
          visibleRowIndexes: [],
          hiddenRowIndexes: [0, 1],
          data: [
            { id: 1, name: 'test' },
            { id: 2, name: 'test' },
          ],
        },
        expectedPatch: [
          { op: 'test', path: '/MyGroup', value: [{ id: 1, name: 'test' }] },
          { op: 'add', path: '/MyGroup/-', value: {} },
        ],
        newModelAfterSave: {
          MyGroup: [
            { id: 1, name: 'test' },
            { id: 2, name: 'test' },
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
      const { mutations } = await render({
        existingRows: [{ id: 1, name: 'test' }],
        edit: { openByDefault },
        hiddenRow: ['equals', ['dataModel', 'MyGroup.name'], 'test'],
      });

      await waitUntil({
        state: {
          editingIndex: undefined,
          addingIndexes: [],
          visibleRowIndexes: [],
          hiddenRowIndexes: [0, 1],
          data: [
            { id: 1, name: 'test' },
            { id: 2, name: 'test' },
          ],
        },
        expectedPatch: [
          { op: 'test', path: '/MyGroup', value: [{ id: 1, name: 'test' }] },
          { op: 'add', path: '/MyGroup/-', value: {} },
        ],
        newModelAfterSave: {
          MyGroup: [
            { id: 1, name: 'test' },
            { id: 2, name: 'test' },
          ],
        },
        mutations,
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
        editingIndex: undefined,
        addingIndexes: [],
        visibleRowIndexes: [],
        hiddenRowIndexes: [],
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
        existingRows: [{ id: 1, name: 'test' }],
        edit: { openByDefault },
      });

      await waitUntil({
        state: {
          editingIndex: openByDefault === true ? undefined : 0,
          addingIndexes: [],
          visibleRowIndexes: [0],
          hiddenRowIndexes: [],
          data: [{ id: 1, name: 'test' }],
        },
        mutations,
      });

      await user.click(screen.getByText('Delete last visible row'));

      await waitUntil({
        state: {
          editingIndex: undefined,
          addingIndexes: [],
          visibleRowIndexes: [],
          hiddenRowIndexes: [],
          data: [],
        },
        expectedPatch: [
          { op: 'test', path: '/MyGroup', value: [{ id: 1, name: 'test' }] },
          { op: 'remove', path: '/MyGroup/0' },
        ],
        newModelAfterSave: { MyGroup: [] },
        mutations,
      });
    },
  );
});

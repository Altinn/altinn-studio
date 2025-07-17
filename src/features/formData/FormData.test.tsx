import React, { useState } from 'react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import type { PropsWithChildren } from 'react';

import { afterAll, beforeAll, expect, jest } from '@jest/globals';
import { act, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import dot from 'dot-object';
import type { JSONSchema7 } from 'json-schema';

import { getIncomingApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
import { defaultMockDataElementId } from 'src/__mocks__/getInstanceDataMock';
import { defaultDataTypeMock, statelessDataTypeMock } from 'src/__mocks__/getLayoutSetsMock';
import { ApplicationMetadataProvider } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { DataModelsProvider } from 'src/features/datamodel/DataModelsProvider';
import { DynamicsProvider } from 'src/features/form/dynamics/DynamicsContext';
import { LayoutsProvider } from 'src/features/form/layout/LayoutsContext';
import { LayoutSetsProvider } from 'src/features/form/layoutSets/LayoutSetsProvider';
import { LayoutSettingsProvider } from 'src/features/form/layoutSettings/LayoutSettingsContext';
import { RulesProvider } from 'src/features/form/rules/RulesContext';
import { GlobalFormDataReadersProvider } from 'src/features/formData/FormDataReaders';
import { FD, FormDataWriteProvider } from 'src/features/formData/FormDataWrite';
import { FormDataWriteProxyProvider } from 'src/features/formData/FormDataWriteProxies';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { fetchApplicationMetadata } from 'src/queries/queries';
import {
  makeFormDataMethodProxies,
  renderWithInstanceAndLayout,
  renderWithMinimalProviders,
} from 'src/test/renderWithProviders';
import type { IDataModelPatchRequest, IDataModelPatchResponse } from 'src/features/formData/types';

interface DataModelFlat {
  'obj1.prop1': string;
  'obj1.prop2': string;
  'obj2.prop1': string;
  'obj3.prop1': number;
}

interface RenderCounts {
  ReaderObj1Prop1: number;
  ReaderObj1Prop2: number;
  ReaderObj2Prop1: number;

  WriterObj1Prop1: number;
  WriterObj1Prop2: number;
  WriterObj2Prop1: number;
}

interface Props {
  path: keyof DataModelFlat;
  countKey: keyof RenderCounts;
  renderCounts: RenderCounts;
}

function NavigateBackButton() {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => {
        navigate('/');
      }}
    >
      Navigate back
    </button>
  );
}

const mockSchema: JSONSchema7 = {
  type: 'object',
  properties: {
    obj1: {
      type: 'object',
      properties: {
        prop1: {
          type: 'string',
        },
        prop2: {
          type: 'string',
        },
      },
    },
    obj2: {
      type: 'object',
      properties: {
        prop1: {
          type: 'string',
        },
      },
    },
    obj3: {
      type: 'object',
      properties: {
        prop1: {
          type: 'integer',
        },
      },
    },
  },
};

type MinimalRenderProps = Partial<Omit<Parameters<typeof renderWithInstanceAndLayout>[0], 'renderer'>>;
type RenderProps = MinimalRenderProps & { renderer: React.ReactElement };
async function statelessRender(props: RenderProps) {
  jest.mocked(fetchApplicationMetadata).mockImplementationOnce(async () =>
    getIncomingApplicationMetadataMock({
      onEntry: {
        show: 'stateless',
      },
    }),
  );
  const initialRenderRef = { current: true };
  const { mocks: formDataMethods, proxies: formDataProxies } = makeFormDataMethodProxies(initialRenderRef);
  return {
    formDataMethods,
    ...(await renderWithMinimalProviders({
      ...props,
      initialRenderRef,
      router: ({ children }: PropsWithChildren) => (
        <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
          <Routes>
            <Route
              path='/'
              element={children}
            />
            <Route
              path='/different'
              element={
                <>
                  <div>something different</div>
                  <NavigateBackButton />
                </>
              }
            />
          </Routes>
        </MemoryRouter>
      ),
      renderer: () => (
        <ApplicationMetadataProvider>
          <GlobalFormDataReadersProvider>
            <LayoutSetsProvider>
              <LayoutsProvider>
                <DataModelsProvider>
                  <LayoutSettingsProvider>
                    <DynamicsProvider>
                      <RulesProvider>
                        <FormDataWriteProxyProvider value={formDataProxies}>
                          <FormDataWriteProvider>{props.renderer}</FormDataWriteProvider>
                        </FormDataWriteProxyProvider>
                      </RulesProvider>
                    </DynamicsProvider>
                  </LayoutSettingsProvider>
                </DataModelsProvider>
              </LayoutsProvider>
            </LayoutSetsProvider>
          </GlobalFormDataReadersProvider>
        </ApplicationMetadataProvider>
      ),
      queries: {
        fetchDataModelSchema: async () => mockSchema,
        fetchFormData: async () => ({}),
        fetchLayouts: async () => ({}),
        ...props.queries,
      },
    })),
  };
}

async function statefulRender(props: RenderProps) {
  jest
    .mocked(fetchApplicationMetadata)
    .mockImplementationOnce(() => Promise.resolve(getIncomingApplicationMetadataMock()));
  return await renderWithInstanceAndLayout({
    ...props,
    alwaysRouteToChildren: true,
    queries: {
      fetchDataModelSchema: async () => mockSchema,
      fetchFormData: async () => ({}),
      fetchLayouts: async () => ({}),
      ...props.queries,
    },
  });
}

describe('FormData', () => {
  describe('Rendering and re-rendering', () => {
    function RenderCountingReader({ path, countKey, renderCounts }: Props) {
      // eslint-disable-next-line react-compiler/react-compiler
      renderCounts[countKey]++;
      const {
        formData: { simpleBinding: value },
      } = useDataModelBindings({
        simpleBinding: { field: path, dataType: statelessDataTypeMock },
      });

      return <div data-testid={`reader-${path}`}>{value}</div>;
    }

    function RenderCountingWriter({ path, countKey, renderCounts }: Props) {
      // eslint-disable-next-line react-compiler/react-compiler
      renderCounts[countKey]++;
      const {
        formData: { simpleBinding: value },
        setValue,
      } = useDataModelBindings({
        simpleBinding: { field: path, dataType: statelessDataTypeMock },
      });

      return (
        <input
          data-testid={`writer-${path}`}
          value={value}
          onChange={(ev) => setValue('simpleBinding', ev.target.value)}
        />
      );
    }

    async function render(props: MinimalRenderProps = {}) {
      const renderCounts: RenderCounts = {
        ReaderObj1Prop1: 0,
        ReaderObj1Prop2: 0,
        ReaderObj2Prop1: 0,

        WriterObj1Prop1: 0,
        WriterObj1Prop2: 0,
        WriterObj2Prop1: 0,
      };

      const utils = await statelessRender({
        renderer: (
          <>
            <RenderCountingReader
              renderCounts={renderCounts}
              path='obj1.prop1'
              countKey='ReaderObj1Prop1'
            />
            <RenderCountingReader
              renderCounts={renderCounts}
              path='obj1.prop2'
              countKey='ReaderObj1Prop2'
            />
            <RenderCountingReader
              renderCounts={renderCounts}
              path='obj2.prop1'
              countKey='ReaderObj2Prop1'
            />
            <RenderCountingWriter
              renderCounts={renderCounts}
              path='obj1.prop1'
              countKey='WriterObj1Prop1'
            />
            <RenderCountingWriter
              renderCounts={renderCounts}
              path='obj1.prop2'
              countKey='WriterObj1Prop2'
            />
            <RenderCountingWriter
              renderCounts={renderCounts}
              path='obj2.prop1'
              countKey='WriterObj2Prop1'
            />
          </>
        ),
        queries: {
          fetchFormData: async () => ({
            obj1: {
              prop1: 'value1',
              prop2: 'value2',
            },
            obj2: {
              prop1: 'value3',
            },
          }),
          ...props.queries,
        },
        ...props,
      });

      return { ...utils, renderCounts };
    }

    it('Form state changes should not affect other components', async () => {
      const { renderCounts, formDataMethods } = await render();
      expect(screen.getAllByTestId(/^reader-/).length).toBe(3);
      expect(screen.getAllByTestId(/^writer-/).length).toBe(3);

      const initialRenders = { ...renderCounts };
      expect(initialRenders).toEqual({
        ReaderObj1Prop1: 1,
        ReaderObj1Prop2: 1,
        ReaderObj2Prop1: 1,

        WriterObj1Prop1: 1,
        WriterObj1Prop2: 1,
        WriterObj2Prop1: 1,
      });

      // Change a value
      await userEvent.type(screen.getByTestId('writer-obj1.prop1'), 'a');
      expect(formDataMethods.setLeafValue).toHaveBeenCalledTimes(1);
      expect(formDataMethods.setLeafValue).toHaveBeenCalledWith({
        reference: { field: 'obj1.prop1', dataType: statelessDataTypeMock },
        newValue: 'value1a',
      });

      expect(renderCounts).toEqual({
        ...initialRenders,
        ReaderObj1Prop1: 2,
        WriterObj1Prop1: 2,
      });
    });
  });

  function SimpleWriter({ path, dataType = statelessDataTypeMock }: { path: keyof DataModelFlat; dataType?: string }) {
    const {
      formData: { simpleBinding: value },
      setValue,
    } = useDataModelBindings({
      simpleBinding: { field: path, dataType },
    });

    return (
      <input
        data-testid={path}
        value={value}
        onChange={(ev) => setValue('simpleBinding', ev.target.value)}
      />
    );
  }

  function HasUnsavedChanges() {
    const hasUnsavedChanges = FD.useHasUnsavedChanges();
    return <div data-testid='hasUnsavedChanges'>{hasUnsavedChanges ? 'true' : 'false'}</div>;
  }

  describe('Locking', () => {
    beforeEach(() => {
      jest
        .spyOn(window, 'logWarn')
        .mockImplementation(() => {})
        .mockName(`window.logWarn`);
      jest
        .spyOn(window, 'logError')
        .mockImplementation(() => {})
        .mockName(`window.logError`);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    function LockActionButton({ lockId, renderInfo }: { lockId: string; renderInfo: boolean }) {
      const lock = FD.useLocking(lockId);
      const { isLocked, lockedBy } = FD.useLockStatus();
      const [currentLock, setCurrentLock] = useState<Awaited<ReturnType<typeof lock>> | undefined>();

      return (
        <>
          {renderInfo && (
            <>
              <div data-testid='isLocked'>{isLocked ? 'true' : 'false'}</div>
              <div data-testid='lockedBy'>{lockedBy === undefined ? 'undefined' : lockedBy}</div>
            </>
          )}
          <button onClick={async () => setCurrentLock(await lock())}>Lock {lockId}</button>
          {currentLock && (
            <button
              onClick={() => {
                // Unlock with some pretend updated form data
                currentLock?.unlock({
                  updatedDataModels: { [defaultMockDataElementId]: { obj1: { prop1: 'new value' } } },
                  updatedValidationIssues: { obj1: [] },
                });
                setCurrentLock(undefined);
              }}
            >
              Unlock {lockId}
            </button>
          )}
        </>
      );
    }

    async function render(props: MinimalRenderProps = {}) {
      return statefulRender({
        renderer: (
          <>
            <SimpleWriter
              path='obj1.prop1'
              dataType={defaultDataTypeMock}
            />
            <SimpleWriter
              path='obj1.prop2'
              dataType={defaultDataTypeMock}
            />
            <SimpleWriter
              path='obj2.prop1'
              dataType={defaultDataTypeMock}
            />
            <LockActionButton
              lockId='myLockId'
              renderInfo={true}
            />
            <LockActionButton
              lockId='myOtherLockId'
              renderInfo={false}
            />
            <HasUnsavedChanges />
          </>
        ),
        queries: {
          fetchFormData: async () => ({
            obj1: {
              prop1: 'value1',
            },
          }),
          ...props.queries,
        },
        ...props,
      });
    }

    beforeAll(() => {
      jest.useFakeTimers();
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('Locking should allow changes to the form data, but some values may be overwritten', async () => {
      const user = userEvent.setup({ delay: null });
      const { mutations } = await render();
      expect(screen.getAllByTestId(/^obj\d+.prop\d+$/).length).toBe(3);
      expect(screen.getByTestId('obj1.prop1')).toHaveValue('value1');

      // Lock the form
      await user.click(screen.getByRole('button', { name: 'Lock myLockId' }));
      await waitFor(() => expect(screen.getByTestId('isLocked')).toHaveTextContent('true'));

      // Change another value (this will be preserved)
      await user.type(screen.getByTestId('obj1.prop2'), 'b');
      expect(screen.getByTestId('obj1.prop2')).toHaveValue('b');

      // Locking prevents saving
      expect(mutations.doPatchFormData.mock).toHaveBeenCalledTimes(0);
      act(() => jest.advanceTimersByTime(5000));
      expect(mutations.doPatchFormData.mock).toHaveBeenCalledTimes(0);

      // Unlock the form
      await user.click(screen.getByRole('button', { name: 'Unlock myLockId' }));
      await waitFor(() => expect(screen.getByTestId('isLocked')).toHaveTextContent('false'));
      await waitFor(() => expect(screen.getByTestId('obj1.prop1')).toHaveValue('new value'));
      expect(screen.getByTestId('obj1.prop2')).toHaveValue('b');
      expect(screen.getByTestId('obj2.prop1')).toHaveValue('');

      // Saving is now allowed, so the form data we saved earlier is sent. The one value
      // we changed that was overwritten is now lost.
      act(() => jest.advanceTimersByTime(5000));
      await waitFor(() => expect(mutations.doPatchFormData.mock).toHaveBeenCalledTimes(1));

      const patchReq = (mutations.doPatchFormData.mock as jest.Mock).mock.calls[0][1] as IDataModelPatchRequest;
      expect(patchReq.patch).toEqual([{ op: 'add', path: '/obj1/prop2', value: 'b' }]);
      expect(window.logError).toHaveBeenCalledTimes(0);
      expect(window.logWarn).toHaveBeenCalledTimes(0);
    });

    it('Locking will not trigger a save if no values have changed', async () => {
      const user = userEvent.setup({ delay: null });
      const { mutations } = await render();
      expect(screen.getAllByTestId(/^obj\d+.prop\d+$/).length).toBe(3);

      await user.click(screen.getByRole('button', { name: 'Lock myLockId' }));
      await waitFor(() => expect(screen.getByTestId('isLocked')).toHaveTextContent('true'));

      expect(mutations.doPatchFormData.mock).toHaveBeenCalledTimes(0);
      act(() => jest.advanceTimersByTime(5000));
      expect(mutations.doPatchFormData.mock).toHaveBeenCalledTimes(0);

      await user.click(await screen.findByRole('button', { name: 'Unlock myLockId' }));
      await waitFor(() => expect(screen.getByTestId('isLocked')).toHaveTextContent('false'));
      await waitFor(() => expect(screen.getByTestId('obj1.prop1')).toHaveValue('new value'));
      expect(screen.getByTestId('obj1.prop2')).toHaveValue('');
      expect(screen.getByTestId('obj2.prop1')).toHaveValue('');

      act(() => jest.advanceTimersByTime(5000));
      await waitFor(() => expect(screen.getByTestId('hasUnsavedChanges')).toHaveTextContent('false'));
      expect(mutations.doPatchFormData.mock).toHaveBeenCalledTimes(0);
      expect(window.logError).toHaveBeenCalledTimes(0);
      expect(window.logWarn).toHaveBeenCalledTimes(0);
    });

    it('Unsaved changes should be saved before locking', async () => {
      const user = userEvent.setup({ delay: null });
      const { mutations } = await render();

      // Change a value
      await user.type(screen.getByTestId('obj2.prop1'), 'a');
      expect(screen.getByTestId('obj2.prop1')).toHaveValue('a');
      expect(screen.getByTestId('hasUnsavedChanges')).toHaveTextContent('true');

      expect(mutations.doPatchFormData.mock).toHaveBeenCalledTimes(0);
      await user.click(screen.getByRole('button', { name: 'Lock myLockId' }));
      await waitFor(() => expect(mutations.doPatchFormData.mock).toHaveBeenCalledTimes(1));
      expect(screen.getByTestId('isLocked')).toHaveTextContent('false'); // The save has not finished yet

      const patchReq = (mutations.doPatchFormData.mock as jest.Mock).mock.calls[0][1] as IDataModelPatchRequest;
      expect(patchReq.patch).toEqual([{ op: 'add', path: '/obj2', value: { prop1: 'a' } }]);

      const response: IDataModelPatchResponse = {
        newDataModel: {
          obj2: { prop1: 'a' },
        },
        validationIssues: {},
      };
      mutations.doPatchFormData.resolve(response);
      await waitFor(() => expect(screen.getByTestId('isLocked')).toHaveTextContent('true'));
      expect(window.logError).toHaveBeenCalledTimes(0);
      expect(window.logWarn).toHaveBeenCalledTimes(0);
    });

    it('Locking should queue up when requested multiple times', async () => {
      const user = userEvent.setup({ delay: null });
      const { mutations } = await render();

      expect(mutations.doPatchFormData.mock).toHaveBeenCalledTimes(0);
      await user.click(screen.getByRole('button', { name: 'Lock myLockId' }));
      await waitFor(() => expect(screen.getByTestId('isLocked')).toHaveTextContent('true'));
      expect(screen.getByTestId('lockedBy')).toHaveTextContent('myLockId');
      expect(mutations.doPatchFormData.mock).toHaveBeenCalledTimes(0);
      expect(window.logError).toHaveBeenCalledTimes(0);
      expect(window.logWarn).toHaveBeenCalledTimes(0);

      // Try to lock another lock id (will wait for the first lock to finish)
      await user.click(screen.getByRole('button', { name: 'Lock myOtherLockId' }));
      await waitFor(() => expect(screen.getByTestId('isLocked')).toHaveTextContent('true'));
      await screen.findByRole('button', { name: 'Unlock myLockId' });
      expect(screen.getByTestId('lockedBy')).toHaveTextContent('myLockId');

      // The other lock id will be locked after the first one is unlocked, so it is still not acquired
      act(() => jest.advanceTimersByTime(5000));
      expect(screen.queryByRole('button', { name: 'Unlock myOtherLockId' })).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Unlock myLockId' }));
      await waitFor(() => expect(screen.getByTestId('lockedBy')).toHaveTextContent('myOtherLockId'));

      await screen.findByRole('button', { name: 'Unlock myOtherLockId' });
      await user.click(screen.getByRole('button', { name: 'Unlock myOtherLockId' }));
      await waitFor(() => expect(screen.getByTestId('lockedBy')).toHaveTextContent('undefined'));
      expect(screen.getByTestId('isLocked')).toHaveTextContent('false');
    });

    it('When multiple locks are scheduled, form data should be saved in between locks', async () => {
      const user = userEvent.setup({ delay: null });
      const { mutations } = await render();

      await user.click(screen.getByRole('button', { name: 'Lock myLockId' }));
      await waitFor(() => expect(screen.getByTestId('isLocked')).toHaveTextContent('true'));
      expect(mutations.doPatchFormData.mock).toHaveBeenCalledTimes(0);

      // Schedule another lock that will be scheduled after the first one
      await user.click(screen.getByRole('button', { name: 'Lock myOtherLockId' }));
      expect(screen.getByTestId('lockedBy')).toHaveTextContent('myLockId');

      // Change a value
      await user.type(screen.getByTestId('obj2.prop1'), 'a');

      // Unlock the first lock
      await user.click(screen.getByRole('button', { name: 'Unlock myLockId' }));
      await waitFor(() => expect(mutations.doPatchFormData.mock).toHaveBeenCalledTimes(1));

      const response: IDataModelPatchResponse = {
        newDataModel: {
          obj2: { prop1: 'a' },
        },
        validationIssues: {},
      };
      mutations.doPatchFormData.resolve(response);

      await waitFor(() => expect(screen.getByTestId('lockedBy')).toHaveTextContent('myOtherLockId'));
      await waitFor(() => expect(screen.getByTestId('isLocked')).toHaveTextContent('true'));
      await user.click(screen.getByRole('button', { name: 'Unlock myOtherLockId' }));
      await waitFor(() => expect(screen.getByTestId('lockedBy')).toHaveTextContent('undefined'));
      expect(mutations.doPatchFormData.mock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Navigation and persistence', () => {
    function NavigationButton() {
      const navigate = useNavigate();
      return (
        <button
          onClick={() => {
            navigate('/different');
          }}
        >
          Navigate to a different page
        </button>
      );
    }

    async function render(props: MinimalRenderProps = {}) {
      return statelessRender({
        renderer: (
          <>
            <HasUnsavedChanges />
            <SimpleWriter path='obj1.prop1' />
            <SimpleWriter path='obj1.prop2' />
            <SimpleWriter path='obj2.prop1' />
            <NavigationButton />
          </>
        ),
        queries: {
          fetchFormData: async () => ({}),
          ...props.queries,
        },
        ...props,
      });
    }

    beforeAll(() => {
      jest.useFakeTimers();
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('Unsaved changes should be saved before navigating', async () => {
      const user = userEvent.setup({ delay: null });
      const { mutations } = await render();

      await user.type(screen.getByTestId('obj2.prop1'), 'a');
      expect(screen.getByTestId('obj2.prop1')).toHaveValue('a');
      expect(screen.getByTestId('hasUnsavedChanges')).toHaveTextContent('true');

      expect(mutations.doPostStatelessFormData.mock).toHaveBeenCalledTimes(0);
      await user.click(screen.getByRole('button', { name: 'Navigate to a different page' }));
      expect(mutations.doPostStatelessFormData.mock).toHaveBeenCalledTimes(1);

      const dataModel = (mutations.doPostStatelessFormData.mock as jest.Mock).mock.calls[0][1];
      expect(dataModel).toEqual({
        obj2: { prop1: 'a' },
      });

      mutations.doPostStatelessFormData.resolve();
      await screen.findByText('something different');
    });

    it('Navigating away and back again should restore the form data', async () => {
      const user = userEvent.setup({ delay: null });
      const { mutations, queries } = await render();

      await user.type(screen.getByTestId('obj2.prop1'), 'a');
      expect(screen.getByTestId('obj2.prop1')).toHaveValue('a');
      expect(screen.getByTestId('hasUnsavedChanges')).toHaveTextContent('true');

      expect(queries.fetchFormData).toHaveBeenCalledTimes(1);
      await user.click(screen.getByRole('button', { name: 'Navigate to a different page' }));
      await screen.findByText('something different');

      // We have to resolve the save operation, as otherwise 'hasUnsavedChanges' will be 'true' when we navigate back
      // as otherwise it would still be working on saving the form data (and form data is marked as unsaved until the
      // save operation is finished).
      expect(mutations.doPostStatelessFormData.mock).toHaveBeenCalledTimes(1);
      mutations.doPostStatelessFormData.resolve();

      await user.click(screen.getByRole('button', { name: 'Navigate back' }));
      await screen.findByTestId('obj2.prop1');

      // We tried to cache the form data, however that broke back button functionality for some apps.
      // See this issue: https://github.com/Altinn/app-frontend-react/issues/2564
      // Also see src/features/formData/useFormDataQuery.tsx where we prevent caching for statless apps
      expect(queries.fetchFormData).toHaveBeenCalledTimes(2);

      // Our mock fetchFormData returns an empty object, so the form data should be reset. Realistically, the form data
      // would be restored when fetching it from the server, as we asserted that it was saved before navigating away.
      expect(screen.getByTestId('obj2.prop1')).toHaveValue('');
      expect(screen.getByTestId('hasUnsavedChanges')).toHaveTextContent('false');
    });
  });

  describe('Invaid data', () => {
    function InvalidReadWrite({
      path,
      dataType = statelessDataTypeMock,
    }: {
      path: keyof DataModelFlat;
      dataType?: string;
    }) {
      const {
        formData: { simpleBinding: value },
        setValue,
      } = useDataModelBindings({
        simpleBinding: { field: path, dataType },
      });
      const validValue = dot.pick(path, FD.useDebounced(dataType));
      const invalidValue = dot.pick(path, FD.useInvalidDebounced(dataType));

      return (
        <>
          <input
            data-testid={path}
            value={value}
            onChange={(ev) => setValue('simpleBinding', ev.target.value)}
          />
          <input
            data-testid={`valid-${path}`}
            disabled
            value={validValue ?? ''}
          />
          <input
            data-testid={`invalid-${path}`}
            disabled
            value={invalidValue ?? ''}
          />
        </>
      );
    }

    async function render(props: MinimalRenderProps = {}) {
      const utils = await statelessRender({
        renderer: <InvalidReadWrite path='obj3.prop1' />,
        queries: {
          fetchFormData: async () => ({
            obj3: {
              prop1: null,
            },
          }),
          ...props.queries,
        },
        ...props,
      });

      return utils;
    }

    it('Clearing an invalid value should remove invalid data', async () => {
      const user = userEvent.setup({ delay: null });
      await render();

      await user.type(screen.getByTestId('obj3.prop1'), '999');
      await waitFor(() => expect(screen.getByTestId('valid-obj3.prop1')).toHaveValue('999'));
      expect(screen.getByTestId('invalid-obj3.prop1')).toHaveValue('');

      await user.clear(screen.getByTestId('obj3.prop1'));
      await user.type(screen.getByTestId('obj3.prop1'), '999999999999999999999999999999');
      await waitFor(() => expect(screen.getByTestId('valid-obj3.prop1')).toHaveValue(''));
      expect(screen.getByTestId('invalid-obj3.prop1')).toHaveValue('999999999999999999999999999999');

      await user.clear(screen.getByTestId('obj3.prop1'));
      await waitFor(() => expect(screen.getByTestId('invalid-obj3.prop1')).toHaveValue(''));
      expect(screen.getByTestId('valid-obj3.prop1')).toHaveValue('');
    });
  });
});

import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { PropsWithChildren } from 'react';

import { afterAll, beforeAll, expect, jest } from '@jest/globals';
import { act, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
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
import { AppRoutingProvider, useNavigate } from 'src/features/routing/AppRoutingContext';
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
  },
};

type MinimalRenderProps = Partial<Omit<Parameters<typeof renderWithInstanceAndLayout>[0], 'renderer'>>;
type RenderProps = MinimalRenderProps & { renderer: React.ReactElement };
async function statelessRender(props: RenderProps) {
  (fetchApplicationMetadata as jest.Mock<typeof fetchApplicationMetadata>).mockImplementationOnce(() =>
    Promise.resolve(
      getIncomingApplicationMetadataMock({
        onEntry: {
          show: 'stateless',
        },
      }),
    ),
  );
  const initialRenderRef = { current: true };
  const { mocks: formDataMethods, proxies: formDataProxies } = makeFormDataMethodProxies(initialRenderRef);
  return {
    formDataMethods,
    ...(await renderWithMinimalProviders({
      ...props,
      initialRenderRef,
      router: ({ children }: PropsWithChildren) => (
        <MemoryRouter>
          <Routes>
            <Route
              path={'/'}
              element={<AppRoutingProvider>{children}</AppRoutingProvider>}
            />
            <Route
              path={'/different'}
              element={
                <AppRoutingProvider>
                  <div>something different</div>
                  <NavigateBackButton />
                </AppRoutingProvider>
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
  (fetchApplicationMetadata as jest.Mock<typeof fetchApplicationMetadata>).mockImplementationOnce(() =>
    Promise.resolve(getIncomingApplicationMetadataMock()),
  );
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
      renderCounts[countKey]++;
      const {
        formData: { simpleBinding: value },
      } = useDataModelBindings({
        simpleBinding: { field: path, dataType: statelessDataTypeMock },
      });

      return <div data-testid={`reader-${path}`}>{value}</div>;
    }

    function RenderCountingWriter({ path, countKey, renderCounts }: Props) {
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
    function LockActionButton() {
      const { lock, unlock, isLocked } = FD.useLocking('myLockId');

      return (
        <>
          <div data-testid='isLocked'>{isLocked ? 'true' : 'false'}</div>
          <button
            onClick={async () => {
              if (isLocked) {
                // Unlock with some pretend updated form data
                unlock({
                  updatedDataModels: { [defaultMockDataElementId]: { obj1: { prop1: 'new value' } } },
                  updatedValidationIssues: { obj1: [] },
                });
              } else {
                await lock();
              }
            }}
          >
            {isLocked ? 'Unlock' : 'Lock'} form data
          </button>
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
            <LockActionButton />
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
      await user.click(screen.getByRole('button', { name: 'Lock form data' }));
      await waitFor(() => expect(screen.getByTestId('isLocked')).toHaveTextContent('true'));

      // Change another value (this will be preserved)
      await user.type(screen.getByTestId('obj1.prop2'), 'b');
      expect(screen.getByTestId('obj1.prop2')).toHaveValue('b');

      // Locking prevents saving
      expect(mutations.doPatchFormData.mock).toHaveBeenCalledTimes(0);
      act(() => jest.advanceTimersByTime(5000));
      expect(mutations.doPatchFormData.mock).toHaveBeenCalledTimes(0);

      // Unlock the form
      await user.click(screen.getByRole('button', { name: 'Unlock form data' }));
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
    });

    it('Locking will not trigger a save if no values have changed', async () => {
      const user = userEvent.setup({ delay: null });
      const { mutations } = await render();
      expect(screen.getAllByTestId(/^obj\d+.prop\d+$/).length).toBe(3);

      await user.click(screen.getByRole('button', { name: 'Lock form data' }));
      await waitFor(() => expect(screen.getByTestId('isLocked')).toHaveTextContent('true'));

      expect(mutations.doPatchFormData.mock).toHaveBeenCalledTimes(0);
      act(() => jest.advanceTimersByTime(5000));
      expect(mutations.doPatchFormData.mock).toHaveBeenCalledTimes(0);

      await user.click(screen.getByRole('button', { name: 'Unlock form data' }));
      await waitFor(() => expect(screen.getByTestId('isLocked')).toHaveTextContent('false'));
      await waitFor(() => expect(screen.getByTestId('obj1.prop1')).toHaveValue('new value'));
      expect(screen.getByTestId('obj1.prop2')).toHaveValue('');
      expect(screen.getByTestId('obj2.prop1')).toHaveValue('');

      act(() => jest.advanceTimersByTime(5000));
      await waitFor(() => expect(screen.getByTestId('hasUnsavedChanges')).toHaveTextContent('false'));
      expect(mutations.doPatchFormData.mock).toHaveBeenCalledTimes(0);
    });

    it('Unsaved changes should be saved before locking', async () => {
      const user = userEvent.setup({ delay: null });
      const { mutations } = await render();

      // Change a value
      await user.type(screen.getByTestId('obj2.prop1'), 'a');
      expect(screen.getByTestId('obj2.prop1')).toHaveValue('a');
      expect(screen.getByTestId('hasUnsavedChanges')).toHaveTextContent('true');

      expect(mutations.doPatchFormData.mock).toHaveBeenCalledTimes(0);
      await user.click(screen.getByRole('button', { name: 'Lock form data' }));
      expect(mutations.doPatchFormData.mock).toHaveBeenCalledTimes(1);
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
      await user.tab();
      expect(screen.getByTestId('obj2.prop1')).toHaveValue('a');
      expect(screen.getByTestId('hasUnsavedChanges')).toHaveTextContent('true');

      expect(queries.fetchFormData).toHaveBeenCalledTimes(1);

      // Pretending to handle the save operation
      await waitFor(() => expect(mutations.doPostStatelessFormData.mock).toHaveBeenCalledTimes(1));
      mutations.doPostStatelessFormData.resolve({ obj2: { prop1: 'a' } });

      await waitFor(() => expect(screen.getByTestId('hasUnsavedChanges')).toHaveTextContent('false'));

      await user.click(screen.getByRole('button', { name: 'Navigate to a different page' }));
      await screen.findByText('something different');

      await user.click(screen.getByRole('button', { name: 'Navigate back' }));
      await screen.findByTestId('obj2.prop1');

      // No need to re-fetch anymore, as the query cache is updated with the saved form data. This used to expect 2
      // calls to fetchFormData, but now it's only 1.
      expect(queries.fetchFormData).toHaveBeenCalledTimes(1);

      // No need to save the form data again, as it was already saved and nothing has changed since then.
      expect(screen.getByTestId('obj2.prop1')).toHaveValue('a');
      expect(screen.getByTestId('hasUnsavedChanges')).toHaveTextContent('false');
      expect(mutations.doPostStatelessFormData.mock).toHaveBeenCalledTimes(1);
    });
  });
});

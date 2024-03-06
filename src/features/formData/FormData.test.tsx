import React from 'react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import type { PropsWithChildren } from 'react';

import { act, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { getApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
import { ApplicationMetadataProvider } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { DataModelSchemaProvider } from 'src/features/datamodel/DataModelSchemaProvider';
import { DynamicsProvider } from 'src/features/form/dynamics/DynamicsContext';
import { LayoutsProvider } from 'src/features/form/layout/LayoutsContext';
import { LayoutSetsProvider } from 'src/features/form/layoutSets/LayoutSetsProvider';
import { LayoutSettingsProvider } from 'src/features/form/layoutSettings/LayoutSettingsContext';
import { RulesProvider } from 'src/features/form/rules/RulesContext';
import { GlobalFormDataReadersProvider } from 'src/features/formData/FormDataReaders';
import { FD } from 'src/features/formData/FormDataWrite';
import { FormDataWriteProxyProvider } from 'src/features/formData/FormDataWriteProxies';
import { InitialFormDataProvider } from 'src/features/formData/InitialFormData';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { makeFormDataMethodProxies, renderWithMinimalProviders } from 'src/test/renderWithProviders';

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

async function genericRender(props: Partial<Parameters<typeof renderWithMinimalProviders>[0]> = {}) {
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
              element={<>{children}</>}
            />
            <Route
              path={'/different'}
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
                <LayoutSettingsProvider>
                  <DynamicsProvider>
                    <RulesProvider>
                      <DataModelSchemaProvider>
                        <FormDataWriteProxyProvider value={formDataProxies}>
                          <InitialFormDataProvider>
                            {props.renderer && typeof props.renderer === 'function' ? props.renderer() : props.renderer}
                          </InitialFormDataProvider>
                        </FormDataWriteProxyProvider>
                      </DataModelSchemaProvider>
                    </RulesProvider>
                  </DynamicsProvider>
                </LayoutSettingsProvider>
              </LayoutsProvider>
            </LayoutSetsProvider>
          </GlobalFormDataReadersProvider>
        </ApplicationMetadataProvider>
      ),
      queries: {
        fetchDataModelSchema: async () => ({
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
        }),
        fetchApplicationMetadata: async () =>
          getApplicationMetadataMock({
            onEntry: {
              show: 'stateless',
            },
          }),
        fetchFormData: async () => ({}),
        fetchLayouts: async () => ({}),
        ...props.queries,
      },
    })),
  };
}

describe('FormData', () => {
  describe('Rendering and re-rendering', () => {
    function RenderCountingReader({ path, countKey, renderCounts }: Props) {
      renderCounts[countKey]++;
      const {
        formData: { simpleBinding: value },
      } = useDataModelBindings({
        simpleBinding: path,
      });

      return <div data-testid={`reader-${path}`}>{value}</div>;
    }

    function RenderCountingWriter({ path, countKey, renderCounts }: Props) {
      renderCounts[countKey]++;
      const {
        formData: { simpleBinding: value },
        setValue,
      } = useDataModelBindings({
        simpleBinding: path,
      });

      return (
        <input
          data-testid={`writer-${path}`}
          value={value}
          onChange={(ev) => setValue('simpleBinding', ev.target.value)}
        />
      );
    }

    async function render(props: Partial<Parameters<typeof renderWithMinimalProviders>[0]> = {}) {
      const renderCounts: RenderCounts = {
        ReaderObj1Prop1: 0,
        ReaderObj1Prop2: 0,
        ReaderObj2Prop1: 0,

        WriterObj1Prop1: 0,
        WriterObj1Prop2: 0,
        WriterObj2Prop1: 0,
      };

      const utils = await genericRender({
        renderer: () => (
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
        path: 'obj1.prop1',
        newValue: 'value1a',
      });

      expect(renderCounts).toEqual({
        ...initialRenders,
        ReaderObj1Prop1: 2,
        WriterObj1Prop1: 2,
      });
    });
  });

  function SimpleWriter({ path }: { path: keyof DataModelFlat }) {
    const {
      formData: { simpleBinding: value },
      setValue,
    } = useDataModelBindings({
      simpleBinding: path,
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
                  newDataModel: { obj1: { prop1: 'new value' } },
                  validationIssues: { obj1: [] },
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

    async function render(props: Partial<Parameters<typeof renderWithMinimalProviders>[0]> = {}) {
      return genericRender({
        renderer: () => (
          <>
            <SimpleWriter path='obj1.prop1' />
            <SimpleWriter path='obj1.prop2' />
            <SimpleWriter path='obj2.prop1' />
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
      expect(mutations.doPostStatelessFormData.mock).toHaveBeenCalledTimes(0);
      act(() => jest.advanceTimersByTime(5000));
      expect(mutations.doPostStatelessFormData.mock).toHaveBeenCalledTimes(0);

      // Unlock the form
      await user.click(screen.getByRole('button', { name: 'Unlock form data' }));
      await waitFor(() => expect(screen.getByTestId('isLocked')).toHaveTextContent('false'));
      await waitFor(() => expect(screen.getByTestId('obj1.prop1')).toHaveValue('new value'));
      expect(screen.getByTestId('obj1.prop2')).toHaveValue('b');
      expect(screen.getByTestId('obj2.prop1')).toHaveValue('');

      // Saving is now allowed, so the form data we saved earlier is sent. The one value
      // we changed that was overwritten is now lost.
      act(() => jest.advanceTimersByTime(5000));
      await waitFor(() => expect(mutations.doPostStatelessFormData.mock).toHaveBeenCalledTimes(1));

      const dataModel = (mutations.doPostStatelessFormData.mock as jest.Mock).mock.calls[0][1];
      expect(dataModel).toEqual({
        obj1: {
          prop1: 'new value',
          prop2: 'b',
        },
      });
    });

    it('Locking will not trigger a save if no values have changed', async () => {
      const user = userEvent.setup({ delay: null });
      const { mutations } = await render();
      expect(screen.getAllByTestId(/^obj\d+.prop\d+$/).length).toBe(3);

      await user.click(screen.getByRole('button', { name: 'Lock form data' }));
      await waitFor(() => expect(screen.getByTestId('isLocked')).toHaveTextContent('true'));

      expect(mutations.doPostStatelessFormData.mock).toHaveBeenCalledTimes(0);
      act(() => jest.advanceTimersByTime(5000));
      expect(mutations.doPostStatelessFormData.mock).toHaveBeenCalledTimes(0);

      await user.click(screen.getByRole('button', { name: 'Unlock form data' }));
      await waitFor(() => expect(screen.getByTestId('isLocked')).toHaveTextContent('false'));
      await waitFor(() => expect(screen.getByTestId('obj1.prop1')).toHaveValue('new value'));
      expect(screen.getByTestId('obj1.prop2')).toHaveValue('');
      expect(screen.getByTestId('obj2.prop1')).toHaveValue('');

      act(() => jest.advanceTimersByTime(5000));
      await waitFor(() => expect(screen.getByTestId('hasUnsavedChanges')).toHaveTextContent('false'));
      expect(mutations.doPostStatelessFormData.mock).toHaveBeenCalledTimes(0);
    });

    it('Unsaved changes should be saved before locking', async () => {
      const user = userEvent.setup({ delay: null });
      const { mutations } = await render();

      // Change a value
      await user.type(screen.getByTestId('obj2.prop1'), 'a');
      expect(screen.getByTestId('obj2.prop1')).toHaveValue('a');
      expect(screen.getByTestId('hasUnsavedChanges')).toHaveTextContent('true');

      expect(mutations.doPostStatelessFormData.mock).toHaveBeenCalledTimes(0);
      await user.click(screen.getByRole('button', { name: 'Lock form data' }));
      expect(mutations.doPostStatelessFormData.mock).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('isLocked')).toHaveTextContent('false'); // The save has not finished yet

      const dataModel = (mutations.doPostStatelessFormData.mock as jest.Mock).mock.calls[0][1];
      expect(dataModel).toEqual({
        obj1: {
          prop1: 'value1',
        },
        obj2: {
          prop1: 'a',
        },
      });

      mutations.doPostStatelessFormData.resolve();
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

    async function render(props: Partial<Parameters<typeof renderWithMinimalProviders>[0]> = {}) {
      return genericRender({
        renderer: () => (
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
      expect(queries.fetchFormData).toHaveBeenCalledTimes(2);

      // Our mock fetchFormData returns an empty object, so the form data should be reset. Realistically, the form data
      // would be restored when fetching it from the server, as we asserted that it was saved before navigating away.
      expect(screen.getByTestId('obj2.prop1')).toHaveValue('');
      expect(screen.getByTestId('hasUnsavedChanges')).toHaveTextContent('false');
    });
  });
});

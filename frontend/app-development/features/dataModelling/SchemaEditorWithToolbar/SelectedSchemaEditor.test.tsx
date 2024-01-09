import React from 'react';
import { renderWithMockStore } from '../../../test/mocks';
import { SelectedSchemaEditor, SelectedSchemaEditorProps } from './SelectedSchemaEditor';
import { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { act, screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import { textMock } from '../../../../testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { datamodelNameMock } from 'app-shared/mocks/datamodelMetadataMocks';
import userEvent from '@testing-library/user-event';
import { dataMock } from '@altinn/schema-editor/mockData';
import { AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS } from 'app-shared/constants';
import { SchemaEditorAppProps } from '@altinn/schema-editor/SchemaEditorApp';
import { QueryKey } from 'app-shared/types/QueryKey';

const user = userEvent.setup();

// Test data:
const modelPath = datamodelNameMock;
const defaultProps: SelectedSchemaEditorProps = {
  modelPath,
};
const org = 'org';
const app = 'app';

// Mocks:
const schemaEditorTestId = 'schema-editor';
const saveButtonTestId = 'save-button';
jest.mock('@altinn/schema-editor/SchemaEditorApp', () => ({
  SchemaEditorApp: ({ save }: SchemaEditorAppProps) => (
    <div data-testid={schemaEditorTestId}>
      <button data-testid={saveButtonTestId} onClick={() => save(dataMock)} />
    </div>
  ),
}));
jest.useFakeTimers({ advanceTimers: true });

describe('SelectedSchemaEditor', () => {
  it('Displays loading spinner while loading', () => {
    const getDatamodel = jest.fn().mockImplementation(() => Promise.resolve({}));
    render({ getDatamodel });
    expect(screen.getByTitle(textMock('general.loading'))).toBeInTheDocument();
  });

  it('Displays error message if loading fails', async () => {
    const message = 'Lorem ipsum dolor sit amet';
    const getDatamodel = jest.fn().mockImplementation(() => Promise.reject(new Error(message)));
    render({ getDatamodel });
    await waitForElementToBeRemoved(() => screen.queryByTitle(textMock('general.loading')));
    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it('Renders SchemaEditorApp when finished loading', async () => {
    const getDatamodel = jest.fn().mockImplementation(() => Promise.resolve({}));
    render({ getDatamodel });
    await waitForElementToBeRemoved(() => screen.queryByTitle(textMock('general.loading')));
    expect(screen.getByTestId(schemaEditorTestId)).toBeInTheDocument();
  });

  it('Debounces the save function', async () => {
    const saveDatamodel = jest.fn();
    const getDatamodel = jest.fn().mockImplementation(() => Promise.resolve(dataMock));

    render({ getDatamodel, saveDatamodel });
    await waitForElementToBeRemoved(() => screen.queryByTitle(textMock('general.loading')));

    const button = screen.getByTestId(saveButtonTestId);
    await act(() => user.click(button));
    expect(saveDatamodel).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS));
    await waitFor(() => expect(saveDatamodel).toHaveBeenCalledTimes(1));
    expect(saveDatamodel).toHaveBeenCalledWith(
      org,
      app,
      modelPath,
      dataMock,
    );
  });

  it('Autosaves when changing between models that are not present in the cache', async () => {
    const saveDatamodel = jest.fn();
    const getDatamodel = jest.fn().mockImplementation(() => Promise.resolve(dataMock));
    const { renderResult: { rerender } } = render({ getDatamodel, saveDatamodel });
    await waitForElementToBeRemoved(() => screen.queryByTitle(textMock('general.loading')));
    expect(saveDatamodel).not.toHaveBeenCalled();

    const updatedProps = {
      ...defaultProps,
      modelPath: 'newModel',
    };
    rerender(<SelectedSchemaEditor {...updatedProps} />);
    jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS);
    await waitFor(() => expect(saveDatamodel).toHaveBeenCalledTimes(1));
    expect(saveDatamodel).toHaveBeenCalledWith(
      org,
      app,
      datamodelNameMock,
      dataMock,
    );
  });

  it('Autosaves when changing between models that are already present in the cache', async () => {
    const saveDatamodel = jest.fn();
    const queryClient = createQueryClientMock();
    const newModelPath = 'newModel';
    queryClient.setQueryData([QueryKey.JsonSchema, org, app, datamodelNameMock], dataMock);
    queryClient.setQueryData([QueryKey.JsonSchema, org, app, newModelPath], dataMock);
    const { renderResult: { rerender } } = render({ saveDatamodel }, queryClient);
    expect(saveDatamodel).not.toHaveBeenCalled();

    const updatedProps = {
      ...defaultProps,
      modelPath: newModelPath,
    };
    rerender(<SelectedSchemaEditor {...updatedProps} />);
    jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS);
    await waitFor(() => expect(saveDatamodel).toHaveBeenCalledTimes(1));
    expect(saveDatamodel).toHaveBeenCalledWith(
      org,
      app,
      datamodelNameMock,
      dataMock,
    );
  });
});

const render = (
  queries: Partial<ServicesContextProps> = {},
  queryClient = createQueryClientMock(),
  props: Partial<SelectedSchemaEditorProps> = {},
) =>
  renderWithMockStore(
    {},
    queries,
    queryClient,
  )(<SelectedSchemaEditor {...defaultProps} {...props} />);

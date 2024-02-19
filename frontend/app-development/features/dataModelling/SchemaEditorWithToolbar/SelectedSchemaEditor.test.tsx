import React from 'react';
import { renderWithMockStore } from '../../../test/mocks';
import { SelectedSchemaEditor, type SelectedSchemaEditorProps } from './SelectedSchemaEditor';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { act, screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import { textMock } from '../../../../testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import {
  createJsonMetadataMock,
  createXsdMetadataMock,
} from 'app-shared/mocks/datamodelMetadataMocks';
import userEvent from '@testing-library/user-event';
import { dataMock } from '@altinn/schema-editor/mockData';
import { AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS } from 'app-shared/constants';
import type { SchemaEditorAppProps } from '@altinn/schema-editor/SchemaEditorApp';
import { QueryKey } from 'app-shared/types/QueryKey';
import { createApiErrorMock } from 'app-shared/mocks/apiErrorMock';
import { createJsonModelPathMock } from 'app-shared/mocks/modelPathMocks';
import type {
  DatamodelMetadataJson,
  DatamodelMetadataXsd,
} from 'app-shared/types/DatamodelMetadata';
import { verifyNeverOccurs } from '../../../../testing/testUtils';

const user = userEvent.setup();

// Test data:
const model1Name = 'model1';
const model2name = 'model2';
const model1Path = createJsonModelPathMock(model1Name);
const model2Path = createJsonModelPathMock(model2name);
const model1MetadataJson: DatamodelMetadataJson = createJsonMetadataMock(model1Name);
const model1MetadataXsd: DatamodelMetadataXsd = createXsdMetadataMock(model1Name);
const model2MetadataJson: DatamodelMetadataJson = createJsonMetadataMock(model2name);
const model2MetadataXsd: DatamodelMetadataXsd = createXsdMetadataMock(model2name);

const defaultProps: SelectedSchemaEditorProps = {
  modelPath: model1Path,
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
    render();
    expect(screen.getByTitle(textMock('general.loading'))).toBeInTheDocument();
  });

  it('Displays error message if loading fails', async () => {
    const message = 'Lorem ipsum dolor sit amet';
    const getDatamodel = jest.fn().mockImplementation(() => Promise.reject(new Error(message)));
    render({ getDatamodel });
    await waitForElementToBeRemoved(() => screen.queryByTitle(textMock('general.loading')));
    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it('Displays custom error message if it exists when invalid xml response', async () => {
    const customMessage =
      "The 'xsd:schema' start tag on line 2 position 2 does not match the end tag of 'xs:schema'. Line 86, position 3";
    const getDatamodel = jest
      .fn()
      .mockImplementation(() => Promise.reject(createApiErrorMock(400, 'DM_05', [customMessage])));
    render({ getDatamodel });
    await waitForElementToBeRemoved(() => screen.queryByTitle(textMock('general.loading')));
    expect(screen.getByText(customMessage)).toBeInTheDocument();
  });

  it('Renders SchemaEditorApp when finished loading', async () => {
    render();
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
    expect(saveDatamodel).toHaveBeenCalledWith(org, app, model1Path, dataMock);
  });

  it('Autosaves when changing between models that are not present in the cache', async () => {
    const saveDatamodel = jest.fn();
    const getDatamodel = jest.fn().mockImplementation(() => Promise.resolve(dataMock));
    const {
      renderResult: { rerender },
    } = render({ getDatamodel, saveDatamodel });
    await waitForElementToBeRemoved(() => screen.queryByTitle(textMock('general.loading')));
    expect(saveDatamodel).not.toHaveBeenCalled();

    const updatedProps = { ...defaultProps, modelPath: model2Path };
    rerender(<SelectedSchemaEditor {...updatedProps} />);
    jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS);
    await waitFor(() => expect(saveDatamodel).toHaveBeenCalledTimes(1));
    expect(saveDatamodel).toHaveBeenCalledWith(org, app, model1Path, dataMock);
  });

  it('Autosaves when changing between models that are already present in the cache', async () => {
    const saveDatamodel = jest.fn();
    const queryClient = createQueryClientMock();
    const newModelPath = 'newModel';
    queryClient.setQueryData([QueryKey.JsonSchema, org, app, model1Path], dataMock);
    queryClient.setQueryData([QueryKey.JsonSchema, org, app, model1Path], dataMock);
    const {
      renderResult: { rerender },
    } = render({ saveDatamodel }, queryClient);
    expect(saveDatamodel).not.toHaveBeenCalled();

    const updatedProps = {
      ...defaultProps,
      modelPath: newModelPath,
    };
    rerender(<SelectedSchemaEditor {...updatedProps} />);
    jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS);
    await waitFor(() => expect(saveDatamodel).toHaveBeenCalledTimes(1));
    expect(saveDatamodel).toHaveBeenCalledWith(org, app, model1Path, dataMock);
  });

  it('Does not save when model is deleted', async () => {
    const saveDatamodel = jest.fn();
    const queryClient = createQueryClientMock();

    queryClient.setQueryData([QueryKey.JsonSchema, org, app, model1Path], dataMock);
    queryClient.setQueryData([QueryKey.JsonSchema, org, app, model2Path], dataMock);
    const {
      renderResult: { rerender },
    } = render({ saveDatamodel }, queryClient);
    expect(saveDatamodel).not.toHaveBeenCalled();

    const updatedProps = {
      ...defaultProps,
      modelPath: model2Path,
    };
    queryClient.setQueryData([QueryKey.DatamodelsJson, org, app], [model2MetadataJson]);
    queryClient.setQueryData([QueryKey.DatamodelsXsd, org, app], [model2MetadataXsd]);
    rerender(<SelectedSchemaEditor {...updatedProps} />);
    jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS);
    await verifyNeverOccurs(() => expect(saveDatamodel).toHaveBeenCalled());
  });
});

const render = (
  queries: Partial<ServicesContextProps> = {},
  queryClient = createQueryClientMock(),
  props: Partial<SelectedSchemaEditorProps> = {},
) => {
  queryClient.setQueryData(
    [QueryKey.DatamodelsJson, org, app],
    [model1MetadataJson, model2MetadataJson],
  );
  queryClient.setQueryData(
    [QueryKey.DatamodelsXsd, org, app],
    [model1MetadataXsd, model2MetadataXsd],
  );
  return renderWithMockStore(
    {},
    queries,
    queryClient,
  )(<SelectedSchemaEditor {...defaultProps} {...props} />);
};

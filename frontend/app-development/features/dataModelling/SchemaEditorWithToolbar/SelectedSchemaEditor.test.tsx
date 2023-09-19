import React from 'react';
import { renderWithMockStore } from '../../../test/mocks';
import { SelectedSchemaEditor, SelectedSchemaEditorProps } from './SelectedSchemaEditor';
import { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { textMock } from '../../../../testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { jsonMetadataMock } from 'app-shared/mocks/datamodelMetadataMocks';

// Test data:
const modelPath = 'testModelPath';
const modelName = 'testModelName';
const defaultProps: SelectedSchemaEditorProps = {
  datamodels: [jsonMetadataMock],
  modelPath,
  modelName,
};

// Mocks:
const schemaEditorTestId = 'schema-editor';
jest.mock('@altinn/schema-editor/components/SchemaEditor', () => ({
  SchemaEditor: () => <div data-testid={schemaEditorTestId} />,
}));

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
});

const render = (
  queries: Partial<ServicesContextProps> = {},
  queryClient = createQueryClientMock(),
  props: Partial<SelectedSchemaEditorProps> = {}
) =>
  renderWithMockStore(
    {},
    queries,
    queryClient
  )(<SelectedSchemaEditor {...defaultProps} {...props} />);

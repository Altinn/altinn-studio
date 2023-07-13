import React from 'react';
import { unmountComponentAtNode } from 'react-dom';
import { render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import { SchemaEditorApp } from './SchemaEditorApp';
import { PreviewConnectionContextProvider } from "app-shared/providers/PreviewConnectionContext";
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { queryClientMock } from '../test/mocks/queryClientMock';
import { textMock } from '../../../testing/mocks/i18nMock';
import { dataMock } from '@altinn/schema-editor/mockData';

let container: any = null;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  unmountComponentAtNode(container);
  container.remove();
  container = null;
});

test('SchemaEditorApp', async () => {
  const getDatamodel = jest.fn().mockImplementation(() => Promise.resolve(dataMock));
  render(
    <ServicesContextProvider {...{ ...queriesMock, getDatamodel }} client={queryClientMock}>
      <PreviewConnectionContextProvider>
        <SchemaEditorApp
          LandingPagePanel={null}
          editMode={false}
          loading={false}
          modelPath='modelPath'
          name='test'
          onSaveSchema={jest.fn()}
          schemaState={{ saving: false, error: null }}
          toggleEditMode={jest.fn()}
          toolbarProps={{
            createNewOpen: false,
            createPathOption: false,
            handleCreateSchema: jest.fn(),
            handleDeleteSchema: jest.fn(),
            handleXsdUploaded: jest.fn(),
            metadataOptions: [],
            modelNames: [],
            selectedOption: { value: { fileName: '', fileType: '.json', repositoryRelativeUrl: '' }, label: '' },
            setCreateNewOpen: jest.fn(),
            setSelectedOption: jest.fn(),
          }}
        />
      </PreviewConnectionContextProvider>
    </ServicesContextProvider>
  );
  await waitForElementToBeRemoved(() => screen.queryByText(textMock('general.loading')));
  expect(screen.getByTestId('schema-editor')).toBeDefined();
});

import React from 'react';
import { render as rtlRender, screen, waitForElementToBeRemoved } from '@testing-library/react';
import { SchemaEditorApp } from './SchemaEditorApp';
import { PreviewConnectionContextProvider } from "app-shared/providers/PreviewConnectionContext";
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { queryClientMock } from '../test/mocks/queryClientMock';
import { textMock } from '../../../testing/mocks/i18nMock';
import { dataMock } from '@altinn/schema-editor/mockData';

export const render = (loading: boolean) => {
  const getDatamodel = jest.fn().mockImplementation(() => Promise.resolve(dataMock));
  rtlRender(
    <ServicesContextProvider {...{ ...queriesMock, getDatamodel }} client={queryClientMock}>
      <PreviewConnectionContextProvider>
        <SchemaEditorApp
          LandingPagePanel={null}
          editMode={false}
          loading={loading}
          modelPath='modelPath'
          name='test'
          onSaveSchema={jest.fn()}
          schemaState={{ saving: false, error: null }}
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
};

describe('SchemaEditorApp', () => {
  it('should render the component', async () => {
    render(false);
    await waitForElementToBeRemoved(() => screen.queryByText(textMock('general.loading')));
    expect(screen.getByTestId('schema-editor')).toBeDefined();
  });

  it('should render the spinner when loading', async () => {
    render(true);
    expect(screen.getByText(textMock('general.loading'))).toBeInTheDocument();
  });
});

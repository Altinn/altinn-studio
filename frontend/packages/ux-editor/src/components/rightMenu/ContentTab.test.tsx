import React from 'react';
import { ContentTab } from './ContentTab';
import { screen } from '@testing-library/react';
import { FormContext } from '../../containers/FormContext';
import type { IAppDataState } from '../../features/appData/appDataReducers';
import type { ITextResourcesState } from '../../features/appData/textResources/textResourcesSlice';
import {
  appDataMock,
  renderWithMockStore,
  textResourcesMock,
} from '../../testing/mocks';

// Test data:
const textResourceEditTestId = 'text-resource-edit';

const FormContextProviderMock = {
  formId: null,
  form: null,
  handleDiscard: jest.fn(),
  handleEdit: jest.fn(),
  handleUpdate: jest.fn(),
  handleContainerSave: jest.fn().mockImplementation(() => Promise.resolve()),
  handleComponentSave: jest.fn().mockImplementation(() => Promise.resolve()),
}

// Mocks:
jest.mock('../TextResourceEdit', () => ({
  TextResourceEdit: () => <div data-testid={textResourceEditTestId} />
}));

describe('ContentTab', () => {
  afterEach(jest.clearAllMocks);

  describe('when editing a text resource', () => {
    it('should render the component', async () => {
      await render(null, textResourceEditTestId);

      expect(screen.getByTestId(textResourceEditTestId)).toBeInTheDocument();
    });
  });
});

const render = async (props: Partial<FormContext> = {}, editId?: string) => {
  const textResources: ITextResourcesState = {
    ...textResourcesMock,
    currentEditId: editId,
  };
  const appData: IAppDataState = {
    ...appDataMock,
    textResources
  };

  return renderWithMockStore({ appData })(
    <FormContext.Provider value={{
      ...FormContextProviderMock,
      ...props
    }}>
      <ContentTab />
    </FormContext.Provider>
  );
};

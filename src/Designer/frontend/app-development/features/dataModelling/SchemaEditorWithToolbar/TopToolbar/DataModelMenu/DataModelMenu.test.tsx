import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { QueryClient } from '@tanstack/react-query';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { app, org } from '@studio/testing/testids';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { createApiErrorMock } from 'app-shared/mocks/apiErrorMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { jsonMetadata1Mock } from '../../../../../../packages/schema-editor/test/mocks/metadataMocks';
import { convertMetadataToOption } from '../../../../../utils/metadataUtils';
import { renderWithProviders } from '../../../../../test/mocks';
import type { DataModelMenuProps } from './DataModelMenu';
import { DataModelMenu } from './DataModelMenu';

const user = userEvent.setup();

// Test data:
const menuText = textMock('schema_editor.data_model_menu');
const replaceText = textMock('schema_editor.replace_data_model');
const file = new File(['hello'], 'hello.xsd', { type: 'text/xml' });
const selectedOption = convertMetadataToOption(jsonMetadata1Mock);
const defaultProps: DataModelMenuProps = { selectedOption };

describe('DataModelMenu', () => {
  afterEach(jest.clearAllMocks);

  it('renders nothing when no data model is selected', () => {
    renderDataModelMenu({ selectedOption: null });
    expect(screen.queryByRole('button', { name: menuText })).not.toBeInTheDocument();
  });

  it('replaces the selected data model with the uploaded file', async () => {
    renderDataModelMenu();
    await openMenu();
    await user.upload(getFileInput(), file);

    const expectedFormData = new FormData();
    expectedFormData.append('file', file);
    expect(queriesMock.replaceDataModelXsd).toHaveBeenCalledTimes(1);
    expect(queriesMock.replaceDataModelXsd).toHaveBeenCalledWith(
      org,
      app,
      jsonMetadata1Mock.repositoryRelativeUrl,
      expectedFormData,
    );
  });

  it('shows an error message when the replacement fails', async () => {
    renderDataModelMenu(
      {},
      {
        replaceDataModelXsd: jest
          .fn()
          .mockImplementation(() => Promise.reject(createApiErrorMock(400))),
      },
      null,
    );
    await openMenu();
    await user.upload(getFileInput(), file);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      textMock('form_filler.file_uploader_validation_error_upload'),
    );
  });
});

const openMenu = () => user.click(screen.getByRole('button', { name: menuText }));
const getFileInput = (): HTMLInputElement => screen.getByLabelText(replaceText);

const renderDataModelMenu = (
  props: Partial<DataModelMenuProps> = {},
  queries: Partial<ServicesContextProps> = {},
  queryClient: QueryClient = createQueryClientMock(),
) => renderWithProviders(queries, queryClient)(<DataModelMenu {...defaultProps} {...props} />);

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DeleteWrapperProps } from './DeleteWrapper';
import { DeleteWrapper } from './DeleteWrapper';
import { StudioDropdown } from '@studio/components';
import { textMock } from '@studio/testing/mocks/i18nMock';
import {
  jsonMetadata1Mock,
  jsonMetadata2Mock,
} from '../../../../../../packages/schema-editor/test/mocks/metadataMocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { convertMetadataToOption } from '../../../../../utils/metadataUtils';
import { renderWithProviders } from '../../../../../test/mocks';
import type { QueryClient } from '@tanstack/react-query';
import { app, org } from '@studio/testing/testids';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { getDataTypesToSignMock } from 'app-shared/mocks/bpmnDefinitionsMock';

const user = userEvent.setup();

// Test data:
const deleteText = textMock('schema_editor.delete_data_model');

const selectedOption = convertMetadataToOption(jsonMetadata1Mock);
const confirmText = textMock('schema_editor.delete_model_confirm', {
  schemaName: selectedOption.label,
});
const defaultProps: DeleteWrapperProps = { selectedOption };

jest.mock('bpmn-moddle', () =>
  jest.fn(() => ({
    fromXML: jest.fn().mockResolvedValue({
      rootElement: getDataTypesToSignMock(['dataModel1', 'dataModel2', 'dataModel3']),
    }),
    toXML: jest.fn().mockResolvedValue({ xml: '<newXml></newXml>' }),
  })),
);

const render = (
  props: Partial<DeleteWrapperProps> = {},
  queries: Partial<ServicesContextProps> = {},
  queryClient: QueryClient = createQueryClientMock(),
) => {
  queryClient.setQueryData(
    [QueryKey.DataModelsMetadata, org, app],
    [jsonMetadata1Mock, jsonMetadata2Mock],
  );
  return renderWithProviders(
    queries,
    queryClient,
  )(
    <StudioDropdown>
      <StudioDropdown.List>
        <StudioDropdown.Item>
          <DeleteWrapper {...defaultProps} {...props} />
        </StudioDropdown.Item>
      </StudioDropdown.List>
    </StudioDropdown>,
  );
};

describe('DeleteWrapper', () => {
  afterEach(jest.clearAllMocks);

  it('should ask the user to confirm the deletion when clicking the delete button', async () => {
    window.confirm = jest.fn();
    render();
    await user.click(getDeleteButton());
    expect(window.confirm).toHaveBeenCalledWith(confirmText);
  });

  it('should not delete the data model when the user cancels the confirmation', async () => {
    window.confirm = jest.fn().mockReturnValue(false);
    render();
    await user.click(getDeleteButton());
    expect(queriesMock.deleteDataModel).not.toHaveBeenCalled();
  });

  it('should remove deleted data types from signing tasks when the user confirms', async () => {
    window.confirm = jest.fn().mockReturnValue(true);
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.DataModelsJson, org, app], []);
    queryClient.setQueryData([QueryKey.DataModelsXsd, org, app], []);
    render({}, {}, queryClient);
    await user.click(getDeleteButton());
    expect(queriesMock.deleteDataModel).toHaveBeenCalledWith(
      org,
      app,
      jsonMetadata1Mock.repositoryRelativeUrl,
    );
    await waitForBpmnToBeUpdated();
  });
});

const getDeleteButton = () => screen.getByRole('button', { name: deleteText });
const waitForBpmnToBeUpdated = () =>
  waitFor(() => expect(queriesMock.updateBpmnXml).toHaveBeenCalled());

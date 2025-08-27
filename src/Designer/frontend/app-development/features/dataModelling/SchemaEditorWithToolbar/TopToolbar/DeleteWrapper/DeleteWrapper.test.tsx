import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DeleteWrapperProps } from './DeleteWrapper';
import { DeleteWrapper } from './DeleteWrapper';
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
const continueText = textMock('schema_editor.confirm_deletion');
const cancelText = textMock('general.cancel');
const confirmText = textMock('schema_editor.delete_model_confirm');

const selectedOption = convertMetadataToOption(jsonMetadata1Mock);
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
  return renderWithProviders(queries, queryClient)(<DeleteWrapper {...defaultProps} {...props} />);
};

describe('DeleteWrapper', () => {
  afterEach(jest.clearAllMocks);

  it('should not be able to open the delete dialog if no option is selected', () => {
    render({ selectedOption: null });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should open the delete dialog when clicking delete button and schemaName is set', async () => {
    render();
    expect(queryDeleteMessage()).not.toBeInTheDocument();
    await user.click(getDeleteButton());
    expect(getDeleteMessage()).toBeInTheDocument();
  });

  it('should call deleteAction callback and close dialog when clicking continue button', async () => {
    render();
    await user.click(getDeleteButton());
    await user.click(getContinueButton());
    expect(queryDeleteMessage()).not.toBeInTheDocument();
  });

  it('should close the delete dialog when clicking cancel', async () => {
    render();
    expect(queryDeleteMessage()).not.toBeInTheDocument();
    await user.click(getDeleteButton());
    expect(getDeleteMessage()).toBeInTheDocument();
    await user.click(getCancelButton());
    expect(queryDeleteMessage()).not.toBeInTheDocument();
  });

  it('should remove deleted data types from signing tasks', async () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.DataModelsJson, org, app], []);
    queryClient.setQueryData([QueryKey.DataModelsXsd, org, app], []);
    render({}, {}, queryClient);
    await user.click(getDeleteButton());
    await user.click(getContinueButton());
    expect(queryDeleteMessage()).not.toBeInTheDocument();
    expect(queriesMock.deleteDataModel).toHaveBeenCalledWith(
      org,
      app,
      jsonMetadata1Mock.repositoryRelativeUrl,
    );
    expect(queriesMock.updateBpmnXml).toHaveBeenCalled();
  });
});

const getDeleteButton = () => screen.getByRole('button', { name: deleteText });
const getContinueButton = () => screen.getByRole('button', { name: continueText });
const getCancelButton = () => screen.getByRole('button', { name: cancelText });
const getDeleteMessage = () => screen.getByText(confirmText);
const queryDeleteMessage = () => screen.queryByText(confirmText);

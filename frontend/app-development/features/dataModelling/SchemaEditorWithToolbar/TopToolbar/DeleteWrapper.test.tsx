import React from 'react';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DeleteWrapperProps } from './DeleteWrapper';
import { DeleteWrapper } from './DeleteWrapper';
import { mockUseTranslation } from '../../../../../testing/mocks/i18nMock';
import {
  jsonMetadata1Mock,
  jsonMetadata2Mock,
} from '../../../../../packages/schema-editor/test/mocks/metadataMocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { convertMetadataToOption } from '../../../../utils/metadataUtils';
import { renderWithMockStore } from '../../../../test/mocks';
import type { QueryClient } from '@tanstack/react-query';

const user = userEvent.setup();

// Test data:
const deleteText = 'Delete';
const continueText = 'Continue';
const cancelText = 'Cancel';
const confirmText = 'Delete {schemaName}?';
const texts = {
  'schema_editor.delete_model_confirm': confirmText,
  'schema_editor.delete_data_model': deleteText,
  'schema_editor.confirm_deletion': continueText,
  'general.cancel': cancelText,
};
const selectedOption = convertMetadataToOption(jsonMetadata1Mock);
const org = 'org';
const app = 'app';
const defaultProps: DeleteWrapperProps = { selectedOption };

// Mocks:
jest.mock('react-i18next', () => ({ useTranslation: () => mockUseTranslation(texts) }));

const render = (
  props: Partial<DeleteWrapperProps> = {},
  queryClient: QueryClient = createQueryClientMock(),
) => {
  queryClient.setQueryData(
    [QueryKey.DatamodelsMetadata, org, app],
    [jsonMetadata1Mock, jsonMetadata2Mock],
  );
  return renderWithMockStore({}, {}, queryClient)(<DeleteWrapper {...defaultProps} {...props} />);
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
    await act(() => user.click(getDeleteButton()));
    expect(getDeleteMessage()).toBeInTheDocument();
  });

  it('should call deleteAction callback and close dialog when clicking continue button', async () => {
    render();
    await act(() => user.click(getDeleteButton()));
    await act(() => user.click(getContinueButton()));
    expect(queryDeleteMessage()).not.toBeInTheDocument();
  });

  it('should close the delete dialog when clicking cancel', async () => {
    render();
    expect(queryDeleteMessage()).not.toBeInTheDocument();
    await act(() => user.click(getDeleteButton()));
    expect(getDeleteMessage()).toBeInTheDocument();
    await act(() => user.click(getCancelButton()));
    expect(queryDeleteMessage()).not.toBeInTheDocument();
  });
});

const getDeleteButton = () => screen.getByRole('button', { name: deleteText });
const getContinueButton = () => screen.getByRole('button', { name: continueText });
const getCancelButton = () => screen.getByRole('button', { name: cancelText });
const getDeleteMessage = () => screen.getByText(confirmText);
const queryDeleteMessage = () => screen.queryByText(confirmText);

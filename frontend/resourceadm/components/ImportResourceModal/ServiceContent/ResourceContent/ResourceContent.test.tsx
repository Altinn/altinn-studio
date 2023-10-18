import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { ResourceContent, ResourceContentProps } from './ResourceContent';
import { Altinn2LinkService } from 'app-shared/types/Altinn2LinkService';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';

const mockServiceName: string = 'TestService';

const mockAltinn2LinkService: Altinn2LinkService = {
  externalServiceCode: 'code1',
  externalServiceEditionCode: 'edition1',
  serviceName: mockServiceName,
};

const mockResourceIdExists: boolean = false;

const defaultProps: ResourceContentProps = {
  altinn2LinkService: mockAltinn2LinkService,
  resourceIdExists: mockResourceIdExists,
};

describe('ResourceContent', () => {
  afterEach(jest.clearAllMocks);

  it('handles ID input correctly', async () => {
    const user = userEvent.setup();
    render(<ResourceContent {...defaultProps} />);

    const editButton = screen.getByRole('button', { name: textMock('general.edit') });
    await act(() => user.click(editButton));

    const idInput = screen.getByLabelText(
      textMock('resourceadm.dashboard_resource_name_and_id_resource_id'),
    );
    expect(idInput).toHaveValue(mockServiceName);

    await act(() => user.type(idInput, ' 1'));

    const idInputAfter = screen.getByLabelText(
      textMock('resourceadm.dashboard_resource_name_and_id_resource_id'),
    );
    expect(idInputAfter).toHaveValue(`${mockServiceName}-1`);
  });

  it('handles edit title correctly', async () => {
    const user = userEvent.setup();
    render(<ResourceContent {...defaultProps} />);

    const titleInput = screen.getByLabelText(
      textMock('resourceadm.dashboard_resource_name_and_id_resource_name'),
    );
    expect(titleInput).toHaveValue(mockServiceName);

    await act(() => user.type(titleInput, ' 1'));
    const titleInputAfter = screen.getByLabelText(
      textMock('resourceadm.dashboard_resource_name_and_id_resource_name'),
    );
    expect(titleInputAfter).toHaveValue(`${mockServiceName} 1`);

    const editButton = screen.getByRole('button', { name: textMock('general.edit') });
    await act(() => user.click(editButton));

    const idInputAfter = screen.getByLabelText(
      textMock('resourceadm.dashboard_resource_name_and_id_resource_id'),
    );
    expect(idInputAfter).toHaveValue(`${mockServiceName}-1`);
  });
});

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { AboutTab, AboutTabProps } from './AboutTab';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';
import { AppConfig } from 'app-shared/types/AppConfig';
import userEvent from '@testing-library/user-event';

const mockApp: string = 'app';
const mockOrg: string = 'org';

const mockAppConfig: AppConfig = {
  repositoryName: 'test',
  serviceName: 'test',
  serviceId: '',
  serviceDescription: '',
};

const mockNewText: string = 'test';

describe('AboutTab', () => {
  const user = userEvent.setup();
  afterEach(jest.clearAllMocks);

  const defaultProps: AboutTabProps = {
    appConfig: mockAppConfig,
    org: mockOrg,
    app: mockApp,
  };

  it('displays the "repo" input as readonly', () => {
    render(<AboutTab {...defaultProps} />);

    const repoNameInput = screen.getByLabelText(textMock('settings_modal.about_tab_repo_label'));
    expect(repoNameInput).toHaveValue(mockAppConfig.repositoryName);
    expect(repoNameInput).toHaveAttribute('readonly');
  });

  it('displays correct value in "name" input field, and updates the value on change', async () => {
    render(<AboutTab {...defaultProps} />);

    const appName = screen.getByLabelText(textMock('settings_modal.about_tab_name_label'));
    expect(appName).toHaveValue(mockAppConfig.serviceName);

    await act(() => user.type(appName, mockNewText));

    expect(appName).toHaveValue(`${mockAppConfig.serviceName}${mockNewText}`);
  });

  it('displays correct value in "alternative id" input field, and updates the value on change', async () => {
    render(<AboutTab {...defaultProps} />);

    const altId = screen.getByLabelText(textMock('settings_modal.about_tab_alt_id_label'));
    expect(altId).toHaveValue(mockAppConfig.serviceId);

    await act(() => user.type(altId, mockNewText));

    expect(altId).toHaveValue(`${mockAppConfig.serviceId}${mockNewText}`);
  });
});

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { CreateRelease } from './CreateRelease';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import {
  type ServicesContextProps,
  ServicesContextProvider,
} from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import userEvent from '@testing-library/user-event';
import { app, org } from '@studio/testing/testids';
import { BuildResult } from 'app-shared/types/Build';
import { TestAppRouter } from '@studio/testing/testRoutingUtils';

const renderCreateRelease = (queries?: Partial<ServicesContextProps>) => {
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    ...queries,
  };

  render(
    <TestAppRouter>
      <ServicesContextProvider {...allQueries} client={createQueryClientMock()}>
        <CreateRelease />
      </ServicesContextProvider>
    </TestAppRouter>,
  );
};

describe('CreateRelease', () => {
  it('renders the component', () => {
    renderCreateRelease();
    expect(
      screen.getByLabelText(textMock('app_create_release.release_version_number')),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(textMock('app_create_release.release_description')),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: textMock('app_create_release.build_version') }),
    ).toBeInTheDocument();
  });

  it('validates tag name correctly', async () => {
    const user = userEvent.setup();
    const newVersionNumber = 'v1';
    renderCreateRelease();
    const inputVersionNumber = screen.getByLabelText(
      textMock('app_create_release.release_version_number'),
    );
    await user.type(inputVersionNumber, newVersionNumber);
    expect(inputVersionNumber).toHaveValue(newVersionNumber);
  });

  it('calls mutation on valid form submission', async () => {
    const user = userEvent.setup();
    const newVersionNumber = 'v1';
    const newVersionDescription = 'test version';
    const mockCommitId = '123';
    const mockGetBranchStatus = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ commit: { id: mockCommitId } }));
    const mockCreateRelease = jest.fn();

    renderCreateRelease({ getBranchStatus: mockGetBranchStatus, createRelease: mockCreateRelease });

    const inputVersionNumber = screen.getByLabelText(
      textMock('app_create_release.release_version_number'),
    );
    await user.type(inputVersionNumber, newVersionNumber);

    const descriptionInput = screen.getByLabelText(
      textMock('app_create_release.release_description'),
    );
    await user.type(descriptionInput, newVersionDescription);

    const buildVersionButton = screen.getByRole('button', {
      name: textMock('app_create_release.build_version'),
    });
    await user.click(buildVersionButton);

    expect(mockGetBranchStatus).toHaveBeenCalled();
    await waitFor(() => {
      expect(mockCreateRelease).toHaveBeenCalledWith(org, app, {
        tagName: newVersionNumber,
        name: newVersionNumber,
        body: newVersionDescription,
        targetCommitish: mockCommitId,
      });
    });
  });

  it('disables build version button when tag name is invalid', async () => {
    const user = userEvent.setup();
    renderCreateRelease();

    const inputVersionNumber = screen.getByLabelText(
      textMock('app_create_release.release_version_number'),
    );
    await user.type(inputVersionNumber, ' ');

    const buildVersionButton = screen.getByRole('button', {
      name: textMock('app_create_release.build_version'),
    });
    expect(buildVersionButton).toBeDisabled();
  });

  it('shows validation error for existing tag name', async () => {
    const user = userEvent.setup();
    const existingTagName = 'v1';
    const mockGetAppReleases = jest.fn().mockImplementation(() =>
      Promise.resolve({
        results: [{ tagName: existingTagName, build: { result: BuildResult.succeeded } }],
      }),
    );

    renderCreateRelease({ getAppReleases: mockGetAppReleases });

    const inputVersionNumber = screen.getByLabelText(
      textMock('app_create_release.release_version_number'),
    );
    await user.type(inputVersionNumber, existingTagName);
    await waitFor(() => inputVersionNumber.blur());

    await waitFor(() => {
      expect(
        screen.getByText(textMock('app_create_release.release_version_number_already_exists')),
      ).toBeInTheDocument();
    });
  });
});

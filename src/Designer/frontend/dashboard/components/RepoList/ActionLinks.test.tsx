import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActionLinks } from './ActionLinks';
import { repository } from 'app-shared/mocks/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from '../../testing/mocks';
import type { Repository } from 'app-shared/types/Repository';

const repoName = 'test-repo';
const repoFullName = 'test-org/test-repo';
const repoUrl = `/repos/${repoFullName}`;
const editUrl = `/editor/${repoFullName}`;

const repo: Repository = {
  ...repository,
  name: repoName,
  full_name: repoFullName,
  html_url: repoUrl,
};

describe('ActionLinks', () => {
  it('should render the three buttons', () => {
    renderWithProviders(<ActionLinks repo={repo} />);
    expect(getGiteaButton()).toBeInTheDocument();
    expect(getEditButton()).toBeInTheDocument();
    expect(getDropdownButton()).toBeInTheDocument();
  });

  it('should open MakeCopyModal when clicking "Make copy" in the dropdown menu', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ActionLinks repo={repo} />);
    await user.click(getDropdownButton());
    expect(queryCopyModalHeading()).not.toBeInTheDocument();
    await user.click(getMakeCopyOption());
    expect(getCopyModalHeading()).toBeInTheDocument();
  });

  it('should open a new tab when clicking "Open in new tab" in the dropdown menu', async () => {
    const user = userEvent.setup();
    window.open = jest.fn();
    renderWithProviders(<ActionLinks repo={repo} />);
    await user.click(getDropdownButton());
    await user.click(getOpenInNewOption());
    expect(window.open).toHaveBeenCalledWith(editUrl, '_blank');
    expect(window.open).toHaveBeenCalledTimes(1);
  });

  const getGiteaButton = () => getButton(giteaButtonName);
  const getEditButton = () => getButton(editButtonName);
  const getDropdownButton = () => getButton(dropdownButtonName);
  const getButton = (name: string) => screen.getByRole('button', { name });

  const getMakeCopyOption = () => getMenuitem(makeCopyOptionName);
  const getOpenInNewOption = () => getMenuitem(openInNewOptionName);
  const getMenuitem = (name: string) => screen.getByRole('button', { name });

  const getCopyModalHeading = () => getHeading(copyModalHeading);
  const getHeading = (name: string) => screen.getByRole('heading', { name });

  const queryCopyModalHeading = () => queryHeading(copyModalHeading);
  const queryHeading = (name: string) => screen.queryByRole('heading', { name });

  const giteaButtonName = textMock('dashboard.show_repo', { appName: repoName });
  const editButtonName = textMock('dashboard.edit_app', { appName: repoName });
  const dropdownButtonName = textMock('dashboard.app_dropdown', { appName: repoName });
  const makeCopyOptionName = textMock('dashboard.make_copy');
  const openInNewOptionName = textMock('dashboard.open_in_new');
  const copyModalHeading = textMock('dashboard.copy_application');
});

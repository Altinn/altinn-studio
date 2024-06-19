import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActionLinks } from './ActionLinks';
import { repository } from 'app-shared/mocks/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';

jest.mock('../MakeCopyModal', () => {
  return {
    MakeCopyModal: React.forwardRef(function MockedMakeCopyModal(
      props,
      ref: React.Ref<HTMLDivElement>,
    ) {
      return <div ref={ref}>Mocked MakeCopyModal</div>;
    }),
  };
});

const repoName = 'test-repo';
const repoFullName = 'test-org/test-repo';
const repoUrl = `/repos/${repoFullName}`;
const editUrl = `/editor/${repoFullName}`;

const repo = {
  ...repository,
  name: repoName,
  full_name: repoFullName,
  html_url: repoUrl,
};

describe('ActionLinks', () => {
  it('should render the three buttons', () => {
    render(<ActionLinks repo={repo} />);

    const giteaButton = screen.getByRole('link', {
      name: textMock('dashboard.show_repo', { appName: repoName }),
    });
    const editButton = screen.getByRole('link', {
      name: textMock('dashboard.edit_app', { appName: repoName }),
    });
    const dropdownButton = screen.getByRole('button', {
      name: textMock('dashboard.app_dropdown', { appName: repoName }),
    });

    expect(giteaButton).toBeInTheDocument();
    expect(editButton).toBeInTheDocument();
    expect(dropdownButton).toBeInTheDocument();
  });

  it('should open MakeCopyModal when clicking "Make copy" in the dropdown menu', async () => {
    const user = userEvent.setup();
    render(<ActionLinks repo={repo} />);

    const dropdownButton = screen.getByRole('button', {
      name: textMock('dashboard.app_dropdown', { appName: repoName }),
    });
    await user.click(dropdownButton);

    const makeCopyOption = screen.getByText(textMock('dashboard.make_copy'));
    await user.click(makeCopyOption);

    expect(screen.getByText('Mocked MakeCopyModal')).toBeInTheDocument();
  });

  it('should open a new tab when clicking "Open in new tab" in the dropdown menu', async () => {
    const user = userEvent.setup();
    render(<ActionLinks repo={repo} />);

    const dropdownButton = screen.getByRole('button', {
      name: textMock('dashboard.app_dropdown', { appName: repoName }),
    });
    await user.click(dropdownButton);

    window.open = jest.fn();
    const openInNewOption = screen.getByText(textMock('dashboard.open_in_new'));
    await user.click(openInNewOption);

    expect(window.open).toHaveBeenCalledWith(editUrl, '_blank');
  });
});

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActionLinks } from './ActionLinks';
import { repository } from 'app-shared/mocks/mocks';
import { textMock } from '../../../testing/mocks/i18nMock';

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

const repo = {
  ...repository,
  name: 'test-repo',
  full_name: 'test-org/test-repo',
  html_url: '/repos/test-org/test-repo',
};

describe('ActionLinks', () => {
  it('should render the three buttons', () => {
    render(<ActionLinks repo={repo} />);

    const giteaButton = screen.getByRole('link', {
      name: textMock('dashboard.show_repo', { appName: repo.name }),
    });
    const editButton = screen.getByRole('link', {
      name: textMock('dashboard.edit_app', { appName: repo.name }),
    });
    const dropdownButton = screen.getByRole('button', {
      name: textMock('dashboard.app_dropdown', { appName: repo.name }),
    });

    expect(giteaButton).toBeInTheDocument();
    expect(editButton).toBeInTheDocument();
    expect(dropdownButton).toBeInTheDocument();
  });

  it('should open MakeCopyModal when clicking "Make copy" in the dropdown menu', async () => {
    const user = userEvent.setup();
    render(<ActionLinks repo={repo} />);

    const dropdownButton = screen.getByRole('button', {
      name: textMock('dashboard.app_dropdown', { appName: repo.name }),
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
      name: textMock('dashboard.app_dropdown', { appName: repo.name }),
    });
    await user.click(dropdownButton);

    window.open = jest.fn();
    const openInNewOption = screen.getByText(textMock('dashboard.open_in_new'));
    await user.click(openInNewOption);

    expect(window.open).toHaveBeenCalledWith('/editor/test-org/test-repo', '_blank');
  });
});

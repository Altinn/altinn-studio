import React from 'react';
import { render, screen } from '@testing-library/react';
import type { CreatedForProps } from './CreatedFor';
import { CreatedFor } from './CreatedFor';
import { RepositoryType } from 'app-shared/types/global';
import {
  mockRepository1,
  mockRepository2,
} from 'app-development/layout/SettingsModalButton/SettingsModal/mocks/repositoryMock';
import { formatDateToDateAndTimeString } from 'app-development/utils/dateUtils';
import { textMock } from '../../../../../../../../testing/mocks/i18nMock';

const mockAuthorName: string = 'Mock Mockesen';

const defaultProps: CreatedForProps = {
  repositoryType: RepositoryType.Datamodels,
  repository: mockRepository1,
  authorName: mockAuthorName,
};

describe('CreatedFor', () => {
  afterEach(jest.clearAllMocks);

  it('displays owners full name when it is set', async () => {
    render(<CreatedFor {...defaultProps} />);

    expect(screen.getByText(mockRepository1.owner.full_name)).toBeInTheDocument();
    expect(screen.queryByText(mockRepository1.owner.login)).not.toBeInTheDocument();
  });

  it('displays owners login name when full name is not set', async () => {
    render(<CreatedFor {...defaultProps} repository={mockRepository2} />);

    expect(screen.queryByText(mockRepository1.owner.full_name)).not.toBeInTheDocument();
    expect(screen.getByText(mockRepository1.owner.login)).toBeInTheDocument();
  });

  it('displays the created date mapped correctly', async () => {
    render(<CreatedFor {...defaultProps} repository={mockRepository2} />);

    const formatedDateString: string = formatDateToDateAndTimeString(mockRepository1.created_at);

    expect(
      screen.getByText(
        textMock('settings_modal.about_tab_created_date', { date: formatedDateString }),
      ),
    ).toBeInTheDocument();
  });
});

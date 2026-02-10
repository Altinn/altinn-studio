import React from 'react';
import { render, screen } from '@testing-library/react';
import type { CreatedForProps } from './CreatedFor';
import { CreatedFor } from './CreatedFor';
import {
  mockRepository1,
  mockRepository2,
} from 'app-development/features/appSettings/mocks/repositoryMock';
import { DateUtils } from '@studio/pure-functions';
import { textMock } from '@studio/testing/mocks/i18nMock';

const mockAuthorName = 'Mock Mockesen';

const defaultProps: CreatedForProps = {
  repository: mockRepository1,
  authorName: mockAuthorName,
};

describe('CreatedFor', () => {
  afterEach(jest.clearAllMocks);

  it('displays owners full name when it is set', async () => {
    render(<CreatedFor {...defaultProps} />);

    const orgElement = screen.getByTestId('created-for-organization');
    expect(orgElement).toHaveTextContent(mockRepository1.owner.full_name);
  });

  it('displays owners login name when full name is not set', async () => {
    render(<CreatedFor {...defaultProps} repository={mockRepository2} />);

    const orgElement = screen.getByTestId('created-for-organization');
    expect(orgElement).not.toHaveTextContent(mockRepository1.owner.full_name);
    expect(orgElement).toHaveTextContent(mockRepository2.owner.login);
  });

  it('displays the created date mapped correctly', async () => {
    render(<CreatedFor {...defaultProps} />);

    const formattedDate = DateUtils.formatDateDDMMYYYY(mockRepository1.created_at);

    expect(screen.getByText(textMock('app_settings.about_tab_created_by'))).toBeInTheDocument();
    expect(screen.getByText(`${mockAuthorName} (${formattedDate})`)).toBeInTheDocument();
  });
});

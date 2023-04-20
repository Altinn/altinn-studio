import { renderWithProviders } from '../../test/testUtils';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { screen } from '@testing-library/react';
import React from 'react';
import { MergeConflictWarning } from './MergeConflictWarning';

describe('MergeConflictWarning', () => {
  it('should render merge conflict warning container', () => {
    renderWithProviders(<MergeConflictWarning org={'mytestorg'} app={'mytestapp'} />, {
      startUrl: `${APP_DEVELOPMENT_BASENAME}/test-org/test-app`,
    });
    const container = screen.getByRole('dialog');
    expect(container).toBeInTheDocument();
  });
});

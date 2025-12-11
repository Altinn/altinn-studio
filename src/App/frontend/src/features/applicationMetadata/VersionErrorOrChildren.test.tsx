import React from 'react';

import { jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';

import { getApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { VersionErrorOrChildren } from 'src/features/applicationMetadata/VersionErrorOrChildren';
import { InstantiationErrorPage } from 'src/features/instantiate/containers/InstantiationErrorPage';

jest.mock('src/features/applicationMetadata/ApplicationMetadataProvider');
jest.mock('src/features/instantiate/containers/InstantiationErrorPage');

describe('VerifyMinimumVersion', () => {
  it('should render children when isValidVersion is true', () => {
    (useApplicationMetadata as jest.Mock<typeof useApplicationMetadata>).mockReturnValueOnce(
      getApplicationMetadataMock({ isValidVersion: true }),
    );

    render(
      <VersionErrorOrChildren>
        <div>Valid Version</div>
      </VersionErrorOrChildren>,
    );

    expect(screen.getByText('Valid Version')).toBeInTheDocument();
  });

  it('should render InstantiationErrorPage when isValidVersion is false', () => {
    (useApplicationMetadata as jest.Mock<typeof useApplicationMetadata>).mockReturnValueOnce(
      getApplicationMetadataMock({ isValidVersion: false }),
    );
    (InstantiationErrorPage as jest.Mock<typeof InstantiationErrorPage>).mockReturnValueOnce(
      <div>Invalid version</div>,
    );

    render(
      <VersionErrorOrChildren>
        <div>Valid Version</div>
      </VersionErrorOrChildren>,
    );

    expect(screen.getByText('Invalid version')).toBeInTheDocument();
    expect(screen.queryByText('Valid version')).not.toBeInTheDocument();
  });
});

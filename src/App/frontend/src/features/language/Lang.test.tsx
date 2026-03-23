import React from 'react';

import { screen } from '@testing-library/react';

import { getInstanceWithProcessMock } from 'src/__mocks__/getInstanceDataMock';
import { InstanceApi } from 'src/core/api-client/instance.api';
import { Lang } from 'src/features/language/Lang';
import { renderWithMinimalProviders } from 'src/test/renderWithProviders';

function TestSubject() {
  return (
    <div data-testid='test-subject'>
      <Lang id='general.create_new' />
    </div>
  );
}

describe('Lang', () => {
  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  beforeEach(() => {
    jest.mocked(InstanceApi.getInstance).mockImplementation(async () => getInstanceWithProcessMock());
  });
  afterAll(() => {
    jest.clearAllMocks();
  });

  it('should work properly', async () => {
    await renderWithMinimalProviders({
      renderer: () => <TestSubject />,
    });

    expect(console.error).not.toHaveBeenCalled();
    expect(screen.getByTestId('test-subject')).toHaveTextContent('Opprett ny');
  });

  it('should handle Lang components in params', async () => {
    await renderWithMinimalProviders({
      renderer: () => (
        <div data-testid='test-subject'>
          <Lang
            id='general.progress'
            params={[
              <Lang
                key={0}
                id='instantiate.inbox'
              />,
              <Lang
                key={1}
                id='instantiate.profile'
              />,
            ]}
          />
        </div>
      ),
    });

    expect(console.error).not.toHaveBeenCalled();
    expect(screen.getByTestId('test-subject')).toHaveTextContent('Side innboks av profil');
  });

  it('should fallback if Language is not provided', async () => {
    await renderWithMinimalProviders({
      renderer: () => <TestSubject />,
    });

    expect(screen.getByTestId('test-subject')).toHaveTextContent('Opprett ny');
    expect(console.error).not.toHaveBeenCalled();
  });
});

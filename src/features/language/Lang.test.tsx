import React from 'react';

import { afterAll, beforeAll, jest } from '@jest/globals';
import { screen } from '@testing-library/react';

import { getProfileMock } from 'src/__mocks__/getProfileMock';
import { Lang } from 'src/features/language/Lang';
import { LanguageProvider } from 'src/features/language/LanguageProvider';
import { fetchUserProfile } from 'src/queries/queries';
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
    jest.mocked(fetchUserProfile).mockImplementation(async () => getProfileMock());
  });
  afterEach(() => {
    jest.resetAllMocks();
  });
  afterAll(() => {
    jest.clearAllMocks();
  });

  it('should work properly', async () => {
    await renderWithMinimalProviders({
      renderer: () => (
        <LanguageProvider>
          <TestSubject />
        </LanguageProvider>
      ),
    });

    expect(console.error).not.toHaveBeenCalled();
    expect(screen.getByTestId('test-subject')).toHaveTextContent('Opprett ny');
  });

  it('should handle Lang components in params', async () => {
    await renderWithMinimalProviders({
      renderer: () => (
        <LanguageProvider>
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
        </LanguageProvider>
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

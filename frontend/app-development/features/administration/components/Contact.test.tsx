import React from 'react';
import { screen } from '@testing-library/react';
import { Contact } from './Contact';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { renderWithProviders } from '../../../test/testUtils';
import { queriesMock } from 'app-development/test/mocks';
import { textMock } from '../../../../testing/mocks/i18nMock';

// Test data
const org = 'org';
const app = 'app';
const title = 'test';

describe('Contact', () => {
  it('renders component', async () => {
    render({
      getAppConfig: jest.fn().mockImplementation(() =>
        Promise.resolve({
          serviceName: title,
        }),
      ),
    });

    expect(screen.getByRole('heading', { name: textMock('contact.heading') })).toBeInTheDocument();

    expect(
      screen.getByRole('heading', { name: textMock('contact.email.heading') }),
    ).toBeInTheDocument();
    expect(screen.getByText(textMock('contact.email.content'))).toBeInTheDocument();
    expect(screen.getByText(textMock('contact.email.link'))).toBeInTheDocument();

    expect(
      screen.getByRole('heading', { name: textMock('contact.slack.heading') }),
    ).toBeInTheDocument();
    expect(screen.getByText(textMock('contact.slack.content'))).toBeInTheDocument();
    expect(screen.getByText(textMock('contact.slack.content_list'))).toBeInTheDocument();
    expect(screen.getByText(textMock('contact.slack.link'))).toBeInTheDocument();
  });

  it('should display error message if fetching goes wrong', async () => {
    render({
      getAppConfig: jest.fn().mockImplementation(() => Promise.reject()),
    });
    expect(await screen.findByText(textMock('contact.fetch_app_error_message')));
  });
});

const render = (queries = {}) => {
  return renderWithProviders(<Contact />, {
    startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}`,
    queries: {
      ...queriesMock,
      ...queries,
    },
  });
};

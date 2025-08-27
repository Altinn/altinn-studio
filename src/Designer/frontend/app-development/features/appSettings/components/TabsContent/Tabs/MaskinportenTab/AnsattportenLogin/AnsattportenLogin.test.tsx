import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AnsattportenLogin, getRedirectUrl } from './AnsattportenLogin';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { settingsPageQueryParamKey } from '../../../../../utils';

jest.mock('app-shared/api/paths');

describe('AnsattportenLogin', () => {
  it('should render the description paragraphs', () => {
    render(<AnsattportenLogin />);

    expect(
      screen.getByText(textMock('app_settings.maskinporten_tab_login_with_description')),
    ).toBeInTheDocument();
  });

  it('should render the login button with correct label', () => {
    render(<AnsattportenLogin />);

    const button = screen.getByRole('button', {
      name: textMock('app_settings.maskinporten_tab_login_with_ansattporten'),
    });
    expect(button).toBeInTheDocument();
  });

  it('should invoke "handleLoginWithAnsattPorten" when login button is clicked', async () => {
    // jsdom does not support .href navigation, therefore this mock is needed.
    const hrefMock = mockWindowLocationHref();

    const user = userEvent.setup();
    render(<AnsattportenLogin />);

    const loginButton = screen.getByRole('button', {
      name: textMock('app_settings.maskinporten_tab_login_with_ansattporten'),
    });

    await user.click(loginButton);
    expect(hrefMock).toHaveBeenCalledTimes(1);
  });
});

describe('getRedirectUrl', () => {
  it('should build and return correct redirect url', () => {
    mockWindowLocationHref();
    const result = getRedirectUrl();
    expect(result).toBe(`/path/to/page?${settingsPageQueryParamKey}=maskinporten`);
  });
});

function mockWindowLocationHref(): jest.Mock {
  const hrefMock = jest.fn();
  delete window.location;
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      href: '',
      origin: 'https://unit-test-com',
      pathname: '/path/to/page',
    } as Location,
  });
  Object.defineProperty(window.location, 'href', {
    set: hrefMock,
  });

  return hrefMock;
}

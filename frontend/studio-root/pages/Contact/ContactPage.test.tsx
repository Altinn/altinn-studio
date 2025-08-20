import React from 'react';
import { screen, render } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { ContactPage } from './ContactPage';
import { useFetchBelongsToOrgQuery } from '../hooks/queries/useFetchBelongsToOrgQuery';

jest.mock('../hooks/queries/useFetchBelongsToOrgQuery');

(useFetchBelongsToOrgQuery as jest.Mock).mockReturnValue({
  data: { belongsToOrg: false },
});

describe('ContactPage', () => {
  it('should display the main heading', () => {
    render(<ContactPage />);
    expect(screen.getByRole('heading', { name: textMock('general.contact') })).toBeInTheDocument();
  });

  it('should display the contact by email section with its content and link', () => {
    render(<ContactPage />);
    expect(
      screen.getByRole('heading', { name: textMock('contact.email.heading') }),
    ).toBeInTheDocument();
    expect(screen.getByText(textMock('contact.email.content'))).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: textMock('general.service_desk.email') }),
    ).toBeInTheDocument();
  });

  it('should display the contact by Slack section with its content, list, and link', () => {
    render(<ContactPage />);

    expect(
      screen.getByRole('heading', { name: textMock('contact.slack.heading') }),
    ).toBeInTheDocument();
    expect(screen.getByText(textMock('contact.slack.content'))).toBeInTheDocument();
    expect(screen.getByText(textMock('contact.slack.content_list'))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: textMock('contact.slack.link') })).toBeInTheDocument();
  });

  it('should display the bug report and feature request section with its content and link', () => {
    render(<ContactPage />);

    expect(
      screen.getByRole('heading', { name: textMock('contact.github_issue.heading') }),
    ).toBeInTheDocument();
    expect(screen.getByText(textMock('contact.github_issue.content'))).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: textMock('contact.github_issue.link_label') }),
    ).toBeInTheDocument();
  });

  it('should not render contact info for "Altinn Servicedesk" if the user does not belong to a org', () => {
    (useFetchBelongsToOrgQuery as jest.Mock).mockReturnValue({
      data: { belongsToOrg: false },
    });
    render(<ContactPage />);

    expect(
      screen.queryByRole('heading', { name: textMock('contact.altinn_servicedesk.heading') }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(textMock('contact.altinn_servicedesk.content')),
    ).not.toBeInTheDocument();
  });

  it('should display contact information to "Altinn Servicedesk" if user belongs to an org', () => {
    (useFetchBelongsToOrgQuery as jest.Mock).mockReturnValue({
      data: { belongsToOrg: true },
    });
    render(<ContactPage />);
    expect(
      screen.getByRole('heading', { name: textMock('contact.altinn_servicedesk.heading') }),
    ).toBeInTheDocument();
    expect(screen.getByText(textMock('contact.altinn_servicedesk.content'))).toBeInTheDocument();
  });
});

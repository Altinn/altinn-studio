import React from 'react';
import { screen, render } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { ContactPage } from './ContactPage';

describe('ContactPage', () => {
  it('should display the main heading', () => {
    render(<ContactPage />);
    expect(
      screen.getByRole('heading', { name: textMock('general.contact'), level: 1 }),
    ).toBeInTheDocument();
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
      screen.getByRole('link', { name: textMock('contact.github_issue.link') }),
    ).toBeInTheDocument();
  });
});

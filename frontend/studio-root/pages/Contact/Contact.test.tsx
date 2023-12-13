import React from 'react';
import { screen, render } from '@testing-library/react';
import { Contact } from './Contact';
import { textMock } from '../../../testing/mocks/i18nMock';

describe('Contact', () => {
  it('renders component', async () => {
    render(<Contact />);

    expect(screen.getByRole('heading', { name: textMock('general.contact') })).toBeInTheDocument();

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

    expect(
      screen.getByRole('heading', { name: textMock('contact.github_issue.heading') }),
    ).toBeInTheDocument();
    expect(screen.getByText(textMock('contact.github_issue.content'))).toBeInTheDocument();
    expect(screen.getByText(textMock('contact.github_issue.link'))).toBeInTheDocument();
  });
});

import React from 'react';
import { ContactSection, type ContactSectionProps } from './ContactSection';
import { render, screen } from '@testing-library/react';
import { SlackIcon } from 'libs/studio-icons/src';

const defaultContactSectionProps: ContactSectionProps = {
  title: '',
  description: '',
  link: {
    name: '',
    href: '',
  },
  Icon: SlackIcon,
};

describe('ContactSection', () => {
  it('should render with provided props', () => {
    const props: ContactSectionProps = {
      ...defaultContactSectionProps,
      title: 'Get in touch',
      description: 'We are helpfull',
      Icon: SlackIcon,
      link: {
        name: 'Get in touch',
        href: 'mailto:email@unittest.com',
      },
      additionalContent: 'additional content',
    };
    renderContactSection(props);

    const icon = screen.getByTitle(props.title);
    expect(icon).toBeInTheDocument();

    const heading = screen.getByRole('heading', { name: props.title, level: 2 });
    expect(heading).toBeInTheDocument();

    const description = screen.getByText(props.description);
    expect(description).toBeInTheDocument();

    const additionalContent = screen.getByText(props.additionalContent as string);
    expect(additionalContent).toBeInTheDocument();

    const link = screen.getByRole('link', { name: props.link.name });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', props.link.href);
  });
});

function renderContactSection(props: ContactSectionProps = defaultContactSectionProps): void {
  render(<ContactSection {...props} />);
}

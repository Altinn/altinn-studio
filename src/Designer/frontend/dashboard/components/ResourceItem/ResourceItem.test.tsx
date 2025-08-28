import React from 'react';
import { render, screen } from '@testing-library/react';
import { ResourceItem, type ResourceItemProps } from './ResourceItem';
import { textMock } from '@studio/testing/mocks/i18nMock';
import '@testing-library/jest-dom';
import { type Resource } from 'dashboard/types/Resource';

const resourceMock: Resource = {
  url: 'https://example.com',
  label: 'test_label',
  description: 'test_description',
  icon: <span data-testid='icon'>🔗</span>,
};

describe('ResourceItem', () => {
  it('should render the icon, label, and description', () => {
    renderResourceItem();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    const linkElement = screen.getByRole('link', { name: textMock(resourceMock.label) });
    expect(linkElement).toBeInTheDocument();
    expect(screen.getByText(textMock(resourceMock.description))).toBeInTheDocument();
  });

  it('should set the correct href and attributes on the link', () => {
    renderResourceItem();

    const linkElement = screen.getByRole('link', { name: textMock(resourceMock.label) });
    expect(linkElement).toHaveAttribute('href', resourceMock.url);
    expect(linkElement).toHaveAttribute('target', '_blank');
    expect(linkElement).toHaveAttribute('rel', 'noopener noreferrer');
  });
});

const renderResourceItem = (props: Partial<ResourceItemProps> = {}) =>
  render(<ResourceItem resource={{ ...resourceMock, ...props.resource }} />);

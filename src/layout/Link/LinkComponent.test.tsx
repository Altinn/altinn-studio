import React from 'react';

import { screen } from '@testing-library/react';

import { LinkComponent } from 'src/layout/Link/LinkComponent';
import { renderGenericComponentTest } from 'src/testUtils';
import type { LinkStyle } from 'src/layout/Link/types';

describe('LinkComponent', () => {
  it('should render link when style is link', () => {
    render({ title: 'Some title', target: 'https://www.digdir.no', style: 'link' });

    expect(screen.getByRole('link', { name: 'Some title' })).toBeInTheDocument();
  });

  it('should render button when style is primary', () => {
    render({ title: 'Some title', target: 'https://www.digdir.no', style: 'primary' });

    expect(screen.getByRole('button', { name: 'Some title' })).toBeInTheDocument();
  });

  it('should render button when style is secondary', () => {
    render({ title: 'Some title', target: 'https://www.digdir.no', style: 'secondary' });

    expect(screen.getByRole('button', { name: 'Some title' })).toBeInTheDocument();
  });

  it('should have correct link attributes when openInNewTab = true', () => {
    render({ title: 'Link to service', target: 'https://www.digdir.no/service', style: 'link', openInNewTab: true });

    expect(screen.getByRole('link', { name: 'Link to service' })).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('link', { name: 'Link to service' })).toHaveAttribute('rel', 'noreferrer');
    expect(screen.getByRole('link', { name: 'Link to service' })).toHaveAttribute(
      'href',
      'https://www.digdir.no/service',
    );
  });

  it('should have correct link attributes when openInNewTab = false', () => {
    render({ title: 'Link to service', target: 'https://www.digdir.no/service', style: 'link' });

    expect(screen.getByRole('link', { name: 'Link to service' })).not.toHaveAttribute('target');
    expect(screen.getByRole('link', { name: 'Link to service' })).not.toHaveAttribute('rel');
    expect(screen.getByRole('link', { name: 'Link to service' })).toHaveAttribute(
      'href',
      'https://www.digdir.no/service',
    );
  });

  it('button should call window.open() with correct arguments when openInNewTab = true', () => {
    global.open = jest.fn();
    render({
      title: 'Button to service',
      target: 'https://www.digdir.no/service',
      style: 'primary',
      openInNewTab: true,
    });

    screen.getByRole('button', { name: 'Button to service' }).click();
    expect(global.open).toHaveBeenCalledWith('https://www.digdir.no/service', '_blank');
  });

  it('button should call window.open() with correct arguments when openInNewTab = false', () => {
    global.open = jest.fn();
    render({
      title: 'Button to service',
      target: 'https://www.digdir.no/service',
      style: 'primary',
    });

    screen.getByRole('button', { name: 'Button to service' }).click();
    expect(global.open).toHaveBeenCalledWith('https://www.digdir.no/service', '_self');
  });
});

const render = ({ title, target, openInNewTab = false, style = 'primary' }) => {
  renderGenericComponentTest({
    type: 'Link',
    renderer: (props) => <LinkComponent {...props} />,
    component: {
      id: 'some-id',
      textResourceBindings: {
        title,
        target,
      },
      openInNewTab,
      style: style as LinkStyle,
    },
  });
};

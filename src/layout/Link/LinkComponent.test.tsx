import React from 'react';

import { screen } from '@testing-library/react';

import { LinkComponent } from 'src/layout/Link/LinkComponent';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { LinkStyle } from 'src/layout/Link/config.generated';

describe('LinkComponent', () => {
  it('should render link when style is link', async () => {
    await render({ title: 'Some title', target: 'https://www.digdir.no', style: 'link' });

    expect(screen.getByRole('link', { name: 'Some title' })).toBeInTheDocument();
  });

  it('should render button when style is primary', async () => {
    await render({ title: 'Some title', target: 'https://www.digdir.no', style: 'primary' });

    expect(screen.getByRole('button', { name: 'Some title' })).toBeInTheDocument();
  });

  it('should render button when style is secondary', async () => {
    await render({ title: 'Some title', target: 'https://www.digdir.no', style: 'secondary' });

    expect(screen.getByRole('button', { name: 'Some title' })).toBeInTheDocument();
  });

  it('should have correct link attributes when openInNewTab = true', async () => {
    await render({
      title: 'Link to service',
      target: 'https://www.digdir.no/service',
      style: 'link',
      openInNewTab: true,
    });

    expect(screen.getByRole('link', { name: 'Link to service' })).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('link', { name: 'Link to service' })).toHaveAttribute('rel', 'noreferrer');
    expect(screen.getByRole('link', { name: 'Link to service' })).toHaveAttribute(
      'href',
      'https://www.digdir.no/service',
    );
    expect(screen.getByRole('link', { name: 'Link to service' })).not.toHaveAttribute('download');
  });

  it('should have correct link attributes when openInNewTab = false', async () => {
    await render({ title: 'Link to service', target: 'https://www.digdir.no/service', style: 'link' });

    expect(screen.getByRole('link', { name: 'Link to service' })).not.toHaveAttribute('target');
    expect(screen.getByRole('link', { name: 'Link to service' })).not.toHaveAttribute('rel');
    expect(screen.getByRole('link', { name: 'Link to service' })).toHaveAttribute(
      'href',
      'https://www.digdir.no/service',
    );
    expect(screen.getByRole('link', { name: 'Link to service' })).not.toHaveAttribute('download');
  });

  it('should have correct link attributes when download is set', async () => {
    await renderWithDownload({
      title: 'Link to service',
      target: 'https://www.digdir.no/service',
      style: 'link',
      download: 'file.txt',
    });

    expect(screen.getByRole('link', { name: 'Link to service' })).not.toHaveAttribute('target');
    expect(screen.getByRole('link', { name: 'Link to service' })).not.toHaveAttribute('rel');
    expect(screen.getByRole('link', { name: 'Link to service' })).toHaveAttribute(
      'href',
      'https://www.digdir.no/service',
    );
    expect(screen.getByRole('link', { name: 'Link to service' })).toHaveAttribute('download', 'file.txt');
  });

  it('button should have correct link attributes when download is set', async () => {
    await renderWithDownload({
      title: 'Button to service',
      target: 'https://www.digdir.no/service',
      style: 'secondary',
      download: 'file.txt',
    });

    // should verify onclick target, but don't know how...
    expect(screen.getByRole('button', { name: 'Button to service' })).toBeInTheDocument();
  });
});

const render = async ({ title, target, openInNewTab = false, style = 'primary' }) => {
  await renderGenericComponentTest({
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

const renderWithDownload = async ({ title, target, openInNewTab = false, style = 'primary', download = '' }) => {
  await renderGenericComponentTest({
    type: 'Link',
    renderer: (props) => <LinkComponent {...props} />,
    component: {
      id: 'some-id',
      textResourceBindings: {
        title,
        target,
        download,
      },
      openInNewTab,
      style: style as LinkStyle,
    },
  });
};

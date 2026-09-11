import React from 'react';

import { screen } from '@testing-library/react';
import type { LinkStyle } from '@app/layout-contract/generated/components/Link/config.generated';

import { LinkComponent } from 'src/layout/Link/LinkComponent';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';

describe('LinkComponent', () => {
  it('renders an anchor with the resolved target when style is link', async () => {
    await render({ title: 'Some title', target: 'https://www.digdir.no', style: 'link' });

    const link = screen.getByRole('link', { name: 'Some title' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://www.digdir.no');
  });

  it('renders a button when style is a button variant', async () => {
    await render({ title: 'Some title', target: 'https://www.digdir.no', style: 'primary' });

    expect(screen.getByRole('button', { name: 'Some title' })).toBeInTheDocument();
  });

  it('wires the download text-resource binding through to the link', async () => {
    await renderWithDownload({
      title: 'Link to service',
      target: 'https://www.digdir.no/service',
      style: 'link',
      download: 'file.txt',
    });

    expect(screen.getByRole('link', { name: 'Link to service' })).toHaveAttribute('download', 'file.txt');
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

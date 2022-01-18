import * as React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';

import AltinnLinkComponent from '../../src/components/AltinnLink';

const render = (props = {}) => {
  const allProps = {
    url: 'url',
    linkTxt: 'linkTxt',
    shouldShowIcon: false,
    ...props,
  };

  rtlRender(<AltinnLinkComponent {...allProps} />);
};

describe('AltinnLink', () => {
  it('should show icon when shouldShowIcon is true', () => {
    render({ shouldShowIcon: true });

    expect(document.querySelector('a > i')).toBeInTheDocument();
  });

  it('should not show icon when shouldShowIcon is false', () => {
    render({ shouldShowIcon: false });

    expect(document.querySelector('a > i')).not.toBeInTheDocument();
  });

  it('should set target to _blank when openInNewTab is true', () => {
    render({ openInNewTab: true });

    expect(
      screen.getByRole('link', {
        name: /linktxt/i,
      }),
    ).toHaveAttribute('target', '_blank');
  });

  it('should set target to "" when openInNewTab is false', () => {
    render({ openInNewTab: false });

    expect(
      screen.getByRole('link', {
        name: /linktxt/i,
      }),
    ).toHaveAttribute('target', '');
  });
});

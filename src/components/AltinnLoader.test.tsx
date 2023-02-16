import React from 'react';

import { render as rtlRender, screen } from '@testing-library/react';

import { AltinnLoader } from 'src/components/AltinnLoader';
import type { IAltinnLoaderProps } from 'src/components/AltinnLoader';

describe('AltinnLoader', () => {
  it('should not show the hidden text, but should be in the document', () => {
    render({});
    expect(screen.getByText('hidden text')).toBeInTheDocument();
    expect(screen.getByText('hidden text')).toHaveClass('sr-only');
    expect(screen.getByText('hidden text').parentElement).toHaveAttribute('id', 'altinn-loader');
  });
  it('should have the id assigned', () => {
    render({
      id: 'some-id',
    });
    expect(screen.getByText('hidden text').parentElement).toHaveAttribute('id', 'some-id');
  });

  it('should append className', () => {
    render({
      className: 'some-class',
    });
    expect(screen.getByText('hidden text').parentElement).toHaveClass('some-class');
  });

  const render = (props: Partial<IAltinnLoaderProps> = {}) => {
    const allProps: IAltinnLoaderProps = {
      srContent: 'hidden text',
      ...props,
    };

    rtlRender(<AltinnLoader {...allProps} />);
  };
});

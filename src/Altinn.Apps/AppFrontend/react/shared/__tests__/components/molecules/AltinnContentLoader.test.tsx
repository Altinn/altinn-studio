import * as React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';

import { AltinnContentLoader } from '../../../src/components/molecules/AltinnContentLoader';

const render = (props = {}) => {
  const allProps = {
    ...props,
  };

  rtlRender(<AltinnContentLoader {...allProps} />);
};

describe('AltinnContentLoader', () => {
  it('should show default loader when no children are passed', () => {
    render();

    expect(screen.getByTestId('AltinnContentIcon')).toBeInTheDocument();
  });

  it('should not show loader when children are passed', () => {
    render({ children: <div data-testid='custom-loader'>loader</div> });

    expect(screen.queryByTestId('AltinnContentIcon')).not.toBeInTheDocument();
    expect(screen.getByTestId('custom-loader')).toBeInTheDocument();
  });
});

import React from 'react';
import { screen } from '@testing-library/react';
import { renderAndRunTimers } from './renderAndRunTimers';

describe('renderAndRunTimers', () => {
  it('Triggers setTimeout callbacks synchronously', () => {
    const readyText = 'Ready';
    const Component = (): React.ReactNode => {
      const ref = React.useCallback((p: HTMLParagraphElement | null) => {
        if (p) setTimeout(() => (p.innerHTML = readyText), 100);
      }, []);
      return <p ref={ref}>Pending</p>;
    };

    renderAndRunTimers(<Component />);

    expect(screen.getByText(readyText)).toBeInTheDocument();
  });
});

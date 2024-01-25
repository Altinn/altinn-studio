import * as React from 'react';
import { render as renderRtl, screen } from '@testing-library/react';
import type { AltinnTextFieldProps } from 'app-shared/components/AltinnTextField/AltinnTextField';
import { AltinnTextField } from 'app-shared/components/AltinnTextField/AltinnTextField';

jest.mock('./AltinnTextField.module.css', () => ({
  withAsterisk: 'withAsterisk',
}));

describe('AltinnTextField', () => {
  it('Renders a text field', () => {
    render();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('Renders with given label', () => {
    const label = 'test-label';
    render({ label });
    expect(screen.getByRole('textbox', { name: label })).toBeInTheDocument();
  });

  it('Renders with given label when there is an asterisk', () => {
    const label = 'test-label';
    render({ label, withAsterisk: true });
    expect(screen.getByRole('textbox', { name: label })).toBeInTheDocument();
  });

  it.each([false, undefined])(
    'Renders without withAsterisk class when "withAsterisk" is %s',
    (withAsterisk) => {
      const { container } = render({ withAsterisk });
      expect(container.firstChild).not.toHaveClass('withAsterisk'); // eslint-disable-line testing-library/no-node-access
    },
  );

  it('Renders with withAsterisk class when "withAsterisk" is true', () => {
    const { container } = render({ withAsterisk: true });
    expect(container.firstChild).toHaveClass('withAsterisk'); // eslint-disable-line testing-library/no-node-access
  });
});

const render = (props: Partial<AltinnTextFieldProps> = {}) =>
  renderRtl(<AltinnTextField {...props} />);

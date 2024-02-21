import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { StudioIconTextfield } from './StudioIconTextfield';
import type { StudioIconTextfieldProps } from './StudioIconTextfield';
import { KeyVerticalIcon } from '@navikt/aksel-icons';
import userEvent from '@testing-library/user-event';

describe('StudioIconTextfield', () => {
  it('render the component', () => {
    renderStudioIconTextfield({});
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('render the icon', async () => {
    renderStudioIconTextfield({
      icon: <KeyVerticalIcon />,
    });
    const icon = screen.getByRole('img', { hidden: true });
    expect(icon).toBeInTheDocument();
  });

  it('should render label', () => {
    renderStudioIconTextfield({
      label: 'id',
    });
    expect(screen.getByText('id')).toBeInTheDocument();
  });

  it('should call onChange', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderStudioIconTextfield({
      onChange,
    });
    const input = screen.getByRole('textbox');
    await act(() => user.type(input, 'test'));
    expect(onChange).toHaveBeenCalled();
  });
});
const renderStudioIconTextfield = (props: Partial<StudioIconTextfieldProps>) => {
  const defaultProps: StudioIconTextfieldProps = {
    icon: <KeyVerticalIcon />,
    label: 'id',
  };
  return render(<StudioIconTextfield {...defaultProps} {...props} />);
};

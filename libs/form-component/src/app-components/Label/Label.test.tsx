import { render, screen } from '@testing-library/react';

import { Label } from './Label';

describe('Label', () => {
  it('renders the label text', () => {
    render(<Label label='First name' />);

    expect(screen.getByText('First name')).toBeInTheDocument();
  });

  it('renders children directly when label is empty', () => {
    render(
      <Label label={undefined}>
        <input data-testid='field' />
      </Label>,
    );

    expect(screen.getByTestId('field')).toBeInTheDocument();
  });

  it('associates the label with a field via htmlFor', () => {
    render(
      <>
        <Label
          label='First name'
          htmlFor='name-input'
        />
        <input id='name-input' />
      </>,
    );

    expect(screen.getByLabelText('First name')).toBeInTheDocument();
  });

  it('shows the required indicator when required', () => {
    render(
      <Label
        label='First name'
        required
        requiredIndicator={<span>*</span>}
      />,
    );

    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('shows the optional indicator when not required', () => {
    render(
      <Label
        label='First name'
        required={false}
        optionalIndicator={<span>(valgfri)</span>}
      />,
    );

    expect(screen.getByText('(valgfri)')).toBeInTheDocument();
  });

  it('renders the description', () => {
    render(
      <Label
        label='First name'
        description={<span>Use the name on your passport</span>}
      />,
    );

    expect(screen.getByText('Use the name on your passport')).toBeInTheDocument();
  });
});

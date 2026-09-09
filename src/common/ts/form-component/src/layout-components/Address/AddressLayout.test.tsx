import type { ComponentProps } from 'react';

import { renderWithTranslations } from '@app/form-component/test/renderWithTranslations';
import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { AddressLayout } from './AddressLayout';

const render = (props?: Partial<ComponentProps<typeof AddressLayout>>) =>
  renderWithTranslations(<AddressLayout id='addr' {...props} />, { language: 'nb' });

describe('AddressLayout', () => {
  it('renders all five fields when simplified is false', () => {
    render({ simplified: false });
    expect(screen.getByRole('textbox', { name: 'Gateadresse' })).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: 'C/O eller annen tilleggsadresse' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Postnr' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Poststed' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Bolignummer/i })).toBeInTheDocument();
  });

  it('hides care-of and house number when simplified is true', () => {
    render({ simplified: true });
    expect(screen.getByRole('textbox', { name: 'Gateadresse' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Postnr' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Poststed' })).toBeInTheDocument();
    expect(
      screen.queryByRole('textbox', { name: 'C/O eller annen tilleggsadresse' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /Bolignummer/i })).not.toBeInTheDocument();
  });

  it('defaults simplified to true', () => {
    render();
    expect(
      screen.queryByRole('textbox', { name: 'C/O eller annen tilleggsadresse' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /Bolignummer/i })).not.toBeInTheDocument();
  });

  it('calls onChange with field key and value when user types in the address field', async () => {
    const onChange = vi.fn();
    render({ simplified: false, onChange });
    await userEvent.type(screen.getByRole('textbox', { name: 'Gateadresse' }), 'a');
    expect(onChange).toHaveBeenCalledWith('address', 'a');
  });

  it('calls onChange with field key when user types in the zip code field', async () => {
    const onChange = vi.fn();
    render({ simplified: false, onChange });
    await userEvent.type(screen.getByRole('textbox', { name: 'Postnr' }), '1');
    expect(onChange).toHaveBeenCalledWith('zipCode', '1');
  });

  it('calls onChange with field key when user types in the care-of field', async () => {
    const onChange = vi.fn();
    render({ simplified: false, onChange });
    await userEvent.type(
      screen.getByRole('textbox', { name: 'C/O eller annen tilleggsadresse' }),
      'b',
    );
    expect(onChange).toHaveBeenCalledWith('careOf', 'b');
  });

  it('calls onChange with field key when user types in the house number field', async () => {
    const onChange = vi.fn();
    render({ simplified: false, onChange });
    await userEvent.type(screen.getByRole('textbox', { name: /Bolignummer/i }), 'H');
    expect(onChange).toHaveBeenCalledWith('houseNumber', 'H');
  });

  it('calls onBlur when a field loses focus', async () => {
    const onBlur = vi.fn();
    render({ simplified: false, onBlur });
    await userEvent.type(screen.getByRole('textbox', { name: 'Gateadresse' }), 'a');
    await userEvent.tab();
    expect(onBlur).toHaveBeenCalled();
  });

  it('keeps the post place field read-only regardless of the readOnly prop', () => {
    render({ simplified: false, readOnly: false });
    expect(screen.getByRole('textbox', { name: 'Poststed' })).toHaveAttribute('readonly');
  });

  it('makes all fields read-only when readOnly is true', () => {
    render({ simplified: false, readOnly: true });
    expect(screen.getByRole('textbox', { name: 'Gateadresse' })).toHaveAttribute('readonly');
    expect(
      screen.getByRole('textbox', { name: 'C/O eller annen tilleggsadresse' }),
    ).toHaveAttribute('readonly');
    expect(screen.getByRole('textbox', { name: 'Postnr' })).toHaveAttribute('readonly');
    expect(screen.getByRole('textbox', { name: 'Poststed' })).toHaveAttribute('readonly');
    expect(screen.getByRole('textbox', { name: /Bolignummer/i })).toHaveAttribute('readonly');
  });

  it('shows required indicators when required is true', () => {
    render({ simplified: false, required: true });
    expect(screen.getByRole('textbox', { name: 'Gateadresse *' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Postnr *' })).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: 'C/O eller annen tilleggsadresse *' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Bolignummer \*/i })).toBeInTheDocument();
  });

  it('shows optional indicators when showOptionalMarking is true and not required', () => {
    render({ simplified: false, required: false, showOptionalMarking: true });
    expect(screen.getByRole('textbox', { name: 'Gateadresse (Valgfri)' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Postnr (Valgfri)' })).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: 'C/O eller annen tilleggsadresse (Valgfri)' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Bolignummer \(Valgfri\)/i })).toBeInTheDocument();
  });

  it('does not show optional indicators when readOnly is true', () => {
    render({ simplified: false, readOnly: true, showOptionalMarking: true });
    expect(
      screen.queryByRole('textbox', { name: 'Gateadresse (Valgfri)' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Postnr (Valgfri)' })).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Gateadresse' })).toBeInTheDocument();
  });

  it('renders custom title keys', () => {
    renderWithTranslations(<AddressLayout id='addr' simplified={false} title='MY_TITLE' />, {
      overrides: { MY_TITLE: 'Custom Title' },
    });
    expect(screen.getByRole('textbox', { name: 'Custom Title' })).toBeInTheDocument();
  });

  it('renders a help button for the house number field', () => {
    render({ simplified: false });
    expect(screen.getByRole('button', { name: /Bolignummer/i })).toBeInTheDocument();
  });

  it('applies error styling when errors.address is true', () => {
    render({ simplified: false, errors: { address: true } });
    expect(screen.getByRole('textbox', { name: 'Gateadresse' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(screen.getByRole('textbox', { name: 'Postnr' })).toHaveAttribute(
      'aria-invalid',
      'false',
    );
  });

  it('renders validation slots in the correct position', () => {
    render({
      simplified: false,
      addressValidation: <span data-testid='addr-val' />,
      zipCodeValidation: <span data-testid='zip-val' />,
    });
    expect(screen.getByTestId('addr-val')).toBeInTheDocument();
    expect(screen.getByTestId('zip-val')).toBeInTheDocument();
  });
});

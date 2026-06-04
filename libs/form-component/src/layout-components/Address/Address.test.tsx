import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

// eslint-disable-next-line no-relative-import-paths/no-relative-import-paths
import { LanguageTranslatorProvider } from '../../LanguageTranslatorProvider';
import { Address } from './Address';
import type { AddressProps } from './Address';

const STRINGS: Record<string, string> = {
  'address_component.address': 'Street address',
  'address_component.care_of': 'Care of',
  'address_component.zip_code': 'Zip code',
  'address_component.post_place': 'Post place',
  'address_component.house_number': 'House number',
  'address_component.house_number_helper': 'Use letter + 4 digits',
  'form_filler.required_label': '*',
  'general.optional': 'optional',
  'helptext.button_title_prefix': 'Help for',
  'helptext.button_title': 'Help',
};

const renderAddress = (props: Partial<AddressProps> = {}) =>
  render(
    <LanguageTranslatorProvider
      lang={(key) => (key ? (STRINGS[key] ?? key) : null)}
      translate={(key) => STRINGS[key] ?? key}
      TranslateComponent={({ tKey }) => <span>{STRINGS[tKey] ?? tKey}</span>}
    >
      <Address id='a1' {...props} />
    </LanguageTranslatorProvider>,
  );

describe('Address', () => {
  it('renders only the address, zip code and post place fields when simplified', () => {
    renderAddress();
    expect(screen.getByRole('textbox', { name: 'Street address' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Zip code' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Post place' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Care of' })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'House number' })).not.toBeInTheDocument();
  });

  it('renders the care-of and house number fields when not simplified', () => {
    renderAddress({ simplified: false });
    expect(screen.getByRole('textbox', { name: 'Street address' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Care of' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Zip code' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Post place' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /House number/ })).toBeInTheDocument();
  });

  it('resolves custom title keys via the context', () => {
    renderAddress({ title: 'my.title' });
    expect(screen.getByRole('textbox', { name: 'my.title' })).toBeInTheDocument();
  });

  it('renders the required indicator on the labels when required', () => {
    renderAddress({ required: true });
    expect(screen.getByRole('textbox', { name: 'Street address *' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Zip code *' })).toBeInTheDocument();
  });

  it('renders an optional marking when not required and showOptionalMarking is set', () => {
    renderAddress({ showOptionalMarking: true });
    expect(screen.getByRole('textbox', { name: 'Street address (optional)' })).toBeInTheDocument();
  });

  it('does not render the optional marking when read-only', () => {
    renderAddress({ showOptionalMarking: true, readOnly: true });
    expect(screen.getByRole('textbox', { name: 'Street address' })).toBeInTheDocument();
    expect(
      screen.queryByRole('textbox', { name: 'Street address (optional)' }),
    ).not.toBeInTheDocument();
  });

  it('marks a field as invalid when its error prop is set', () => {
    const { container } = renderAddress({ zipCodeError: true });
    expect(container.querySelector('#address_zip_code_a1')).toHaveAttribute('aria-invalid', 'true');
    expect(container.querySelector('#address_address_a1')).toHaveAttribute('aria-invalid', 'false');
  });

  it('always renders the post place field as read-only', () => {
    const { container } = renderAddress();
    expect(container.querySelector('#address_post_place_a1')).toHaveAttribute('readonly');
  });

  it('marks the editable fields as read-only when readOnly is set', () => {
    const { container } = renderAddress();
    expect(container.querySelector('#address_address_a1')).not.toHaveAttribute('readonly');
    const readOnly = render(
      <LanguageTranslatorProvider
        lang={(key) => key ?? null}
        translate={(key) => STRINGS[key] ?? key}
        TranslateComponent={({ tKey }) => <span>{tKey}</span>}
      >
        <Address id='a2' readOnly={true} />
      </LanguageTranslatorProvider>,
    );
    expect(readOnly.container.querySelector('#address_address_a2')).toHaveAttribute('readonly');
  });

  it('commits the typed street address value via onAddressChange', async () => {
    const onAddressChange = vi.fn();
    renderAddress({ onAddressChange });
    await userEvent.type(screen.getByRole('textbox', { name: 'Street address' }), 'x');
    expect(onAddressChange).toHaveBeenCalledWith('x');
  });

  it('renders a help button next to the house number field', () => {
    renderAddress({ simplified: false });
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Help for House number');
  });

  it('renders the per-field and component validation slots', () => {
    renderAddress({
      simplified: false,
      addressValidations: <div>address-error</div>,
      careOfValidations: <div>care-of-error</div>,
      zipCodeValidations: <div>zip-error</div>,
      houseNumberValidations: <div>house-error</div>,
      componentValidations: <div>component-error</div>,
    });
    expect(screen.getByText('address-error')).toBeInTheDocument();
    expect(screen.getByText('care-of-error')).toBeInTheDocument();
    expect(screen.getByText('zip-error')).toBeInTheDocument();
    expect(screen.getByText('house-error')).toBeInTheDocument();
    expect(screen.getByText('component-error')).toBeInTheDocument();
  });
});

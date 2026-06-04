import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

// eslint-disable-next-line no-relative-import-paths/no-relative-import-paths
import { LanguageTranslatorProvider } from '../../LanguageTranslatorProvider';
import { Address, ADDRESS_CONFIG_KEYS } from './Address';
import type { AddressProps } from './Address';

// The story keys mimic text-resource bindings. The provider below resolves them to display strings,
// the same way the app does at runtime via the language context.
const TEXTS: Record<string, string> = {
  'address_component.address': 'Street address',
  'address_component.care_of': 'C/O or other additional address',
  'address_component.zip_code': 'Zip code',
  'address_component.post_place': 'Post place',
  'address_component.house_number': 'House number',
  'address_component.house_number_helper':
    'If there is more than one residence on the same address, the house number consists of one letter and four digits.',
  'form_filler.required_label': '*',
  'general.optional': 'optional',
  'helptext.button_title_prefix': 'Help for',
  'helptext.button_title': 'Help',
};

// Controlled wrapper so the playground reflects typing into the fields.
function ControlledAddress(args: AddressProps) {
  const [address, setAddress] = useState(args.address);
  const [careOf, setCareOf] = useState(args.careOf);
  const [zipCode, setZipCode] = useState(args.zipCode);
  const [houseNumber, setHouseNumber] = useState(args.houseNumber);

  return (
    <Address
      {...args}
      address={address}
      careOf={careOf}
      zipCode={zipCode}
      houseNumber={houseNumber}
      onAddressChange={setAddress}
      onCareOfChange={setCareOf}
      onZipCodeChange={setZipCode}
      onHouseNumberChange={setHouseNumber}
    />
  );
}

const meta = {
  title: 'LayoutComponents/Address',
  component: Address,
  parameters: {
    layout: 'padded',
    // Only the configurable (Studio-mapped) props get controls; the internal wiring (field values,
    // error state, event handlers and validation slots) stays hidden and non-editable.
    controls: { include: ADDRESS_CONFIG_KEYS },
  },
  decorators: [
    (Story) => (
      <LanguageTranslatorProvider
        lang={(key) => (key ? (TEXTS[key] ?? key) : null)}
        translate={(key) => TEXTS[key] ?? key}
        TranslateComponent={({ tKey }) => TEXTS[tKey] ?? tKey}
      >
        <Story />
      </LanguageTranslatorProvider>
    ),
  ],
  render: (args) => <ControlledAddress {...args} />,
  args: {
    id: 'address-preview',
  },
} satisfies Meta<typeof Address>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};

export const Complex: Story = {
  args: {
    simplified: false,
  },
};

export const Required: Story = {
  args: {
    simplified: false,
    required: true,
  },
};

export const Optional: Story = {
  args: {
    simplified: false,
    showOptionalMarking: true,
  },
};

export const ReadOnly: Story = {
  args: {
    simplified: false,
    readOnly: true,
    address: 'Slottsplassen 1',
    zipCode: '0010',
    postPlace: 'OSLO',
  },
};

export const Prefilled: Story = {
  args: {
    simplified: false,
    address: 'Slottsplassen 1',
    careOf: 'c/o The King',
    zipCode: '0010',
    postPlace: 'OSLO',
    houseNumber: 'H0101',
  },
};

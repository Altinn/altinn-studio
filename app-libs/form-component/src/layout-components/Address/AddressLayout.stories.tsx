import type { PropCategories } from '@app/form-component/layout-components/common/storybook';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { AddressLayout } from './AddressLayout';
import type { AddressLayoutProps } from './AddressLayout';

/**
 * Sorts each prop into a Storybook docs group, consumed by AddressLayout.mdx. This is docs-only
 * metadata, so it lives with the stories rather than in the component.
 * `satisfies PropCategories<AddressLayoutProps>` makes it exhaustive — a new prop must be classified.
 */
export const ADDRESS_PROP_CATEGORIES = {
  id: 'config',
  simplified: 'config',
  required: 'config',
  readOnly: 'config',
  showOptionalMarking: 'config',
  titleKey: 'config',
  careOfTitleKey: 'config',
  zipCodeTitleKey: 'config',
  postPlaceTitleKey: 'config',
  houseNumberTitleKey: 'config',
  address: 'runtime',
  careOf: 'runtime',
  zipCode: 'runtime',
  postPlace: 'runtime',
  houseNumber: 'runtime',
  errors: 'runtime',
  onChange: 'runtime',
  onBlur: 'runtime',
  addressValidation: 'runtime',
  careOfValidation: 'runtime',
  zipCodeValidation: 'runtime',
  houseNumberValidation: 'runtime',
  componentValidation: 'runtime',
} satisfies PropCategories<AddressLayoutProps>;

const meta = {
  title: 'LayoutComponents/Address',
  component: AddressLayout,
  // ADDRESS_PROP_CATEGORIES is a docs helper, not a story — keep CSF from rendering it as one.
  excludeStories: ['ADDRESS_PROP_CATEGORIES'],
  parameters: {
    layout: 'padded',
  },
  args: {
    id: 'address-preview',
    simplified: false,
    address: 'Karl Johans gate 22',
    zipCode: '0026',
    postPlace: 'OSLO',
  },
} satisfies Meta<typeof AddressLayout>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};

export const Simplified: Story = {
  args: {
    simplified: true,
  },
};

export const Required: Story = {
  args: {
    required: true,
  },
};

export const ReadOnly: Story = {
  args: {
    readOnly: true,
  },
};

export const WithErrors: Story = {
  args: {
    errors: { address: true, zipCode: true },
  },
};

export const WithOptionalMarking: Story = {
  args: {
    showOptionalMarking: true,
  },
};

export const FullAddress: Story = {
  args: {
    simplified: false,
    address: 'Karl Johans gate 22',
    careOf: 'c/o Stortinget',
    zipCode: '0026',
    postPlace: 'OSLO',
    houseNumber: 'H0101',
  },
};

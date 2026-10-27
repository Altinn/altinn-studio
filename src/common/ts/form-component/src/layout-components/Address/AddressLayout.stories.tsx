import { useEffect, useState } from 'react';

import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';
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
  // Text resources — Studio "Tekst" section (textResourceBindings)
  title: 'text',
  careOfTitle: 'text',
  zipCodeTitle: 'text',
  postPlaceTitle: 'text',
  houseNumberTitle: 'text',
  // Data-model-bound values — Studio "Datamodeller" section
  address: 'data',
  careOf: 'data',
  zipCode: 'data',
  postPlace: 'data',
  houseNumber: 'data',
  // Configurable options — Studio "Innhold" section
  id: 'content',
  simplified: 'content',
  required: 'content',
  readOnly: 'content',
  showOptionalMarking: 'content',
  // Injected by the runtime wrapper — not part of the Studio configuration
  errors: 'runtime',
  onChange: 'runtime',
  onBlur: 'runtime',
  addressValidation: 'runtime',
  careOfValidation: 'runtime',
  zipCodeValidation: 'runtime',
  houseNumberValidation: 'runtime',
  componentValidation: 'runtime',
} satisfies PropCategories<AddressLayoutProps>;

// Stands in for the postal code registry: a zip code's first digit roughly gives its region.
const POST_PLACE_BY_REGION = [
  'OSLO',
  'FREDRIKSTAD',
  'HAMAR',
  'DRAMMEN',
  'STAVANGER',
  'BERGEN',
  'ÅLESUND',
  'TRONDHEIM',
  'BODØ',
  'TROMSØ',
];

function mockPostPlaceLookup(zipCode: string): string {
  return /^\d{4}$/.test(zipCode) ? POST_PLACE_BY_REGION[Number(zipCode[0])] : '';
}

/**
 * Like `useArgs`, but updates show immediately. Args update asynchronously, so a controlled input
 * rendered from args alone drops fast keystrokes. The draft covers the gap until args catch up.
 */
function useArgsDraft<TArgs extends object>(
  args: TArgs,
  updateArgs: (update: Partial<TArgs>) => void,
) {
  const [draft, setDraft] = useState<Partial<TArgs> | null>(null);
  const caughtUp =
    draft !== null &&
    (Object.keys(draft) as (keyof TArgs)[]).every((key) => draft[key] === args[key]);
  if (caughtUp) {
    setDraft(null);
  }
  const values: TArgs = { ...args, ...draft };

  function updateValues(update: Partial<TArgs>) {
    setDraft((prev) => ({ ...prev, ...update }));
    updateArgs(update);
  }

  return [values, updateValues] as const;
}

interface EditableAddressProps {
  args: AddressLayoutProps;
  updateArgs: (update: Partial<AddressLayoutProps>) => void;
}

function EditableAddress({ args, updateArgs }: EditableAddressProps) {
  const [values, updateValues] = useArgsDraft(args, updateArgs);
  const postPlace = mockPostPlaceLookup(values.zipCode ?? '');

  // Keep the postPlace control in sync, whether the zip code came from the input or Controls.
  useEffect(() => {
    if (args.postPlace !== postPlace) {
      updateArgs({ postPlace });
    }
  }, [args.postPlace, postPlace, updateArgs]);

  return (
    <AddressLayout
      {...values}
      postPlace={postPlace}
      onChange={(field, value) => {
        args.onChange?.(field, value);
        updateValues({ [field]: value });
      }}
    />
  );
}

const meta = {
  title: 'LayoutComponents/Address',
  component: AddressLayout,
  // ADDRESS_PROP_CATEGORIES is a docs helper, not a story — keep CSF from rendering it as one.
  excludeStories: ['ADDRESS_PROP_CATEGORIES'],
  parameters: {
    layout: 'padded',
    docs: {
      subtitle:
        'I denne forhåndsvisningen fylles poststed ut etter første siffer i postnummeret, for eksempel gir 0xxx OSLO og 5xxx BERGEN. I appen slås poststedet opp i postnummerregisteret.',
    },
  },
  args: {
    id: 'address-preview',
    simplified: false,
    address: 'Karl Johans gate 22',
    zipCode: '0026',
    postPlace: 'OSLO',
    onChange: fn(),
    onBlur: fn(),
  },
  render: function Render(args) {
    const [, updateArgs] = useArgs();
    return <EditableAddress args={args} updateArgs={updateArgs} />;
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

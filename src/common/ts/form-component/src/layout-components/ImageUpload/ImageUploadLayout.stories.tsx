import { ValidationMessages } from '@app/form-component/app-components/ValidationMessages';
import { fn } from 'storybook/test';
import type { PropCategories } from '@app/form-component/layout-components/common/storybook';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { ImageUploadLayout } from './ImageUploadLayout';
import type { ImageUploadLayoutProps } from './ImageUploadLayout';
import type { StoredImage } from './imageUploadUtils';

/**
 * Sorts each prop into a Storybook docs group.
 */
export const IMAGE_UPLOAD_PROP_CATEGORIES = {
  // Text resources — Studio "Tekst" section
  title: 'text',
  description: 'text',
  help: 'text',
  // Configurable options — Studio "Innhold" section
  componentId: 'content',
  crop: 'content',
  readOnly: 'content',
  required: 'content',
  showOptionalMarking: 'content',
  labelGrid: 'content',
  // Runtime — injected by the wrapper
  storedImage: 'runtime',
  imageUrl: 'runtime',
  onSave: 'runtime',
  onDelete: 'runtime',
  innerGrid: 'runtime',
  validationGrid: 'runtime',
  validationMessages: 'runtime',
} satisfies PropCategories<ImageUploadLayoutProps>;

// A tiny inline placeholder image so the stored-image preview renders something in the playground.
const placeholderImageUrl = `data:image/svg+xml;utf8,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='250' height='250'><rect width='250' height='250' fill='%234a90d9'/><text x='50%' y='50%' fill='white' font-size='20' text-anchor='middle' dominant-baseline='middle'>Bilde</text></svg>",
)}`;

const storedImage: StoredImage = {
  uploaded: true,
  deleting: false,
  data: { id: 'att-1', filename: 'profilbilde.png' },
};

const meta = {
  title: 'LayoutComponents/ImageUpload',
  component: ImageUploadLayout,
  excludeStories: ['IMAGE_UPLOAD_PROP_CATEGORIES'],
  parameters: { layout: 'padded' },
  args: {
    componentId: 'bildeopplasting',
    title: 'Profilbilde',
    onSave: fn(),
    onDelete: fn(),
  },
  argTypes: {
    crop: {
      options: ['Sirkel', 'Rektangel'],
      mapping: {
        Sirkel: { shape: 'circle', diameter: 250 },
        Rektangel: { shape: 'rectangle', width: 300, height: 200 },
      },
      control: { type: 'radio' },
    },
  },
} satisfies Meta<typeof ImageUploadLayout>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    description: 'Last opp et bilde og beskjær det til ønsket område.',
    help: 'Bildet lagres som PNG.',
  },
};

export const RectangularCrop: Story = {
  args: {
    title: 'Forsidebilde',
    crop: { shape: 'rectangle', width: 300, height: 200 },
  },
};

export const WithStoredImage: Story = {
  args: {
    storedImage,
    imageUrl: placeholderImageUrl,
  },
};

export const ReadOnly: Story = {
  args: {
    readOnly: true,
    storedImage,
    imageUrl: placeholderImageUrl,
  },
};

export const WithValidationMessages: Story = {
  args: {
    validationMessages: (
      <ValidationMessages
        validations={[{ id: 'required', severity: 'error', message: 'Du må laste opp et bilde.' }]}
      />
    ),
  },
};

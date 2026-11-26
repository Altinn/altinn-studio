import { withComponentGrid } from '@app/form-component/layout-components/common/storybook';
import { StaticLanguageTranslatorProvider } from '@app/form-component/test/StaticLanguageTranslatorProvider';
import { fn } from 'storybook/test';
import type { PropCategories } from '@app/form-component/layout-components/common/storybook';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { FileUploadLayout } from './FileUploadLayout';
import type { FileUploadLayoutProps } from './FileUploadLayout';

/**
 * Sorts each prop into a Storybook docs group, consumed by FileUploadLayout.mdx.
 */
export const FILE_UPLOAD_PROP_CATEGORIES = {
  // Text resources — Studio "Tekst" section (textResourceBindings)
  title: 'text',
  description: 'text',
  help: 'text',
  // Configurable options — Studio "Innhold" section
  componentId: 'content',
  required: 'content',
  readOnly: 'content',
  showOptionalMarking: 'content',
  displayMode: 'content',
  maxFileSizeInMB: 'content',
  maxNumberOfAttachments: 'content',
  hasCustomFileEndings: 'content',
  validFileEndings: 'content',
  // Injected by the runtime wrapper — not part of the Studio configuration
  numberOfAttachments: 'runtime',
  dropzoneOpen: 'runtime',
  onAddClick: 'runtime',
  onDrop: 'runtime',
  hasValidationErrors: 'runtime',
  fileList: 'runtime',
  failedAttachments: 'runtime',
  validationMessages: 'runtime',
  innerGrid: 'runtime',
  validationGrid: 'runtime',
  label: 'runtime',
} satisfies PropCategories<FileUploadLayoutProps>;

const meta = {
  title: 'LayoutComponents/FileUpload',
  component: FileUploadLayout,
  // FILE_UPLOAD_PROP_CATEGORIES is a docs helper, not a story — keep CSF from rendering it as one.
  excludeStories: ['FILE_UPLOAD_PROP_CATEGORIES'],
  parameters: {
    layout: 'padded',
  },
  // The drop zone texts are built-in text resources, so resolve them for the playground. The
  // component's own props are plain strings here, which pass through unchanged.
  decorators: [
    (Story) => (
      <StaticLanguageTranslatorProvider language='nb'>
        <Story />
      </StaticLanguageTranslatorProvider>
    ),
    withComponentGrid,
  ],
  argTypes: {
    displayMode: {
      control: 'inline-radio',
      options: ['list', 'simple'],
    },
  },
  args: {
    componentId: 'file-upload-preview',
    maxFileSizeInMB: 25,
    maxNumberOfAttachments: 3,
    numberOfAttachments: 0,
    onDrop: fn(),
    onAddClick: fn(),
  },
} satisfies Meta<typeof FileUploadLayout>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    title: 'Last opp vedlegg',
    description: 'Legg ved dokumentasjon på inntekten din.',
    help: 'Du kan laste opp opptil tre filer.',
    required: true,
  },
};

export const CustomFileEndings: Story = {
  args: {
    title: 'Last opp vedlegg',
    hasCustomFileEndings: true,
    validFileEndings: '.pdf,.png',
  },
};

export const SimpleWithAttachment: Story = {
  args: {
    title: 'Last opp vedlegg',
    displayMode: 'simple',
    numberOfAttachments: 1,
    fileList: 'inntekt.pdf',
  },
};

export const ReadOnly: Story = {
  args: {
    title: 'Last opp vedlegg',
    readOnly: true,
  },
};

export const WithValidationMessages: Story = {
  args: {
    title: 'Last opp vedlegg',
    required: true,
    hasValidationErrors: true,
    validationMessages: 'Du må laste opp minst ett vedlegg.',
  },
};

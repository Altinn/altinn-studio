import type { PropCategories } from '@app/form-component/layout-components/common/storybook';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Link } from './Link';
import type { LinkProps } from './Link';

export const LINK_PROP_CATEGORIES = {
  // Text resources — Studio "Tekst" section
  title: 'text',
  target: 'text',
  download: 'text',
  // Configurable options — Studio "Innhold" section
  componentId: 'content',
  style: 'content',
  openInNewTab: 'content',
  size: 'content',
  fullWidth: 'content',
  textAlign: 'content',
  position: 'content',
  // Runtime — injected by wrapper
  innerGrid: 'runtime',
  validationGrid: 'runtime',
  validationMessages: 'runtime',
} satisfies PropCategories<LinkProps>;

const meta = {
  title: 'LayoutComponents/Link',
  component: Link,
  excludeStories: ['LINK_PROP_CATEGORIES'],
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    style: {
      control: 'radio',
      options: ['primary', 'secondary', 'link'],
    },
    size: {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
    },
    textAlign: {
      control: 'radio',
      options: ['left', 'center', 'right'],
    },
    position: {
      control: 'radio',
      options: ['left', 'center', 'right'],
    },
  },
  args: {
    componentId: 'link-preview',
    style: 'link',
    title: 'Gå til Altinn',
    target: 'https://www.altinn.no',
    openInNewTab: false,
  },
} satisfies Meta<typeof Link>;

export default meta;

type Story = StoryObj<typeof meta>;

export const AsLink: Story = {};

export const AsPrimaryButton: Story = {
  args: {
    style: 'primary',
    title: 'Start ny søknad',
  },
};

export const AsSecondaryButton: Story = {
  args: {
    style: 'secondary',
    title: 'Avbryt',
  },
};

export const OpensInNewTab: Story = {
  args: {
    title: 'Åpne veiledningen i ny fane',
    target: 'https://www.altinn.no/hjelp',
    openInNewTab: true,
  },
};

export const AsDownload: Story = {
  args: {
    title: 'Last ned skjema',
    target: 'https://www.altinn.no/skjema.pdf',
    download: 'skjema.pdf',
  },
};

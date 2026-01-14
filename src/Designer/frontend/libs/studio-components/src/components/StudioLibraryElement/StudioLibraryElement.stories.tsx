import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioLibraryElement } from './';

const meta: Meta<typeof StudioLibraryElement> = {
  title: 'Components/StudioLibraryElement',
  component: StudioLibraryElement,
};

type Story = StoryObj<typeof meta>;

export const Normal: Story = {
  args: {
    href: '#',
    info: '249 codes',
    latestPublishedVersion: '3',
    name: 'ISO 3166-1 countries',
    onClick: (e) => {
      e.preventDefault();
    },
    texts: {
      published: 'Published',
      unnamed: 'Unnamed',
      version: (version: string) => `Version ${version}`,
    },
  },
};

export const Unpublished: Story = {
  args: {
    ...Normal.args,
    latestPublishedVersion: null,
  },
};

export const Unnamed: Story = {
  args: {
    ...Unpublished.args,
    name: null,
  },
};

export default meta;

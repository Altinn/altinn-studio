import type { ReactElement } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { BookIcon, VideoIcon, QuestionmarkDiamondIcon, ExternalLinkIcon } from '@studio/icons';
import type { StudioContentMenuStoryExampleProps } from './StudioContentMenuStoryExample';
import { StudioContentMenuStoryExample } from './StudioContentMenuStoryExample';

const meta = {
  title: 'Components/StudioContentMenu',
  component: StudioContentMenuStoryExample,
  argTypes: {
    buttonTabs: {
      control: 'object',
      description: 'Array of button menu tabs with icons, names, and ids.',
      table: {
        type: { summary: 'StudioContentMenuButtonTabProps<TabId>[]' },
      },
    },
    linkTabs: {
      control: 'object',
      description:
        'Array of link menu tabs with icons, names, and ids. Provide an optional link-element to return `props` in renderTab.',
      table: {
        type: { summary: 'StudioContentMenuLinkTabProps<TabId>[]' },
      },
    },
    selectedTabId: {
      table: { disable: true },
    },
    onChangeTab: {
      table: { disable: true },
    },
  },
} satisfies Meta<StudioContentMenuStoryExampleProps<StudioMenuTabName>>;
export default meta;

type Story = StoryObj<typeof meta>;

type StudioMenuTabName = 'booksTab' | 'videosTab' | 'tabWithVeryLongTabName' | 'tabAsLink';

export const Preview: Story = {
  args: {
    selectedTabId: 'booksTab',
    buttonTabs: [
      {
        tabId: 'booksTab',
        tabName: 'Bøker',
        icon: <BookIcon />,
      },
      {
        tabId: 'videosTab',
        tabName: 'Filmer',
        icon: <VideoIcon />,
      },
      {
        tabId: 'tabWithVeryLongTabName',
        tabName: 'LoremIpsumLoremIpsumLoremIpsum',
        icon: <QuestionmarkDiamondIcon />,
      },
    ],
    linkTabs: [
      {
        tabId: 'tabAsLink',
        tabName: 'Gå til Designsystemet',
        icon: <ExternalLinkIcon />,
        renderTab: (props): ReactElement => (
          <a href={'https://next.storybook.designsystemet.no'} {...props} />
        ),
      },
    ],
    onChangeTab: (): void => {},
  },
};

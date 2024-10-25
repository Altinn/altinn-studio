import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { BookIcon, VideoIcon, QuestionmarkDiamondIcon, ExternalLinkIcon } from '@studio/icons';
import {
  StudioContentMenuWrapper,
  StudioContentMenuWrapperProps,
} from './StudioContentMenuWrapper';

type Story = StoryFn<StudioContentMenuWrapperProps<StudioMenuTabName>>;

const meta: Meta<StudioContentMenuWrapperProps<StudioMenuTabName>> = {
  title: 'Components/StudioContentMenu',
  component: StudioContentMenuWrapper,
  argTypes: {
    buttonTabs: {
      control: 'object',
      description: 'Array of button menu tabs with icons, names, and ids.',
      table: {
        type: { summary: 'StudioButtonTabType<TabId>[]' },
      },
    },
    linkTabs: {
      control: 'object',
      description:
        'Array of link menu tabs with icons, names, and ids. Prop `to` defines the url to navigate to.',
      table: {
        type: { summary: 'StudioLinkTabType<TabId>[]' },
      },
    },
    selectedTabId: {
      table: { disable: true },
    },
    onChangeTab: {
      table: { disable: true },
    },
  },
};

export default meta;

type StudioMenuTabName = 'booksTab' | 'videosTab' | 'tabWithVeryLongTabName' | 'tabAsLink';

export const Preview: Story = (args: StudioContentMenuWrapperProps<StudioMenuTabName>) => (
  <StudioContentMenuWrapper {...args} />
);

Preview.args = {
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
      to: 'https://next.storybook.designsystemet.no',
    },
  ],
  onChangeTab: () => {},
};

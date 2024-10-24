import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { StudioContentMenu } from './StudioContentMenu';
import { BookIcon, VideoIcon, QuestionmarkDiamondIcon, ExternalLinkIcon } from '@studio/icons';
import { StudioContentMenuWrapper } from './StudioContentMenuWrapper';

type Story = StoryFn<typeof StudioContentMenu>;

const meta: Meta = {
  title: 'Components/StudioContentMenu',
  component: StudioContentMenu,
  argTypes: {
    contentTabs: {
      control: 'object',
      description:
        'Array of menu tabs with icons, names, and ids. Add prop `to` if tab should navigate to a different url',
      table: {
        type: { summary: 'StudioMenuTabType<TabId>[]' },
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

export const Preview: Story = (args) => (
  <StudioContentMenuWrapper {...args}></StudioContentMenuWrapper>
);

Preview.args = {
  contentTabs: [
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
    {
      tabId: 'tabAsLink',
      tabName: 'Gå til Designsystemet',
      icon: <ExternalLinkIcon />,
      to: 'https://next.storybook.designsystemet.no',
    },
  ],
};

import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { StudioContentMenu } from './StudioContentMenu';
import { BookIcon, VideoIcon, QuestionmarkDiamondIcon } from '@studio/icons';
import { StudioContentMenuWrapper } from './StudioContentMenuWrapper';

type Story = StoryFn<typeof StudioContentMenu>;

const meta: Meta = {
  title: 'Components/StudioContentMenu',
  component: StudioContentMenu,
  argTypes: {},
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
  ],
  selectedTabId: undefined,
  onChangeTab: (tabId) => {},
};

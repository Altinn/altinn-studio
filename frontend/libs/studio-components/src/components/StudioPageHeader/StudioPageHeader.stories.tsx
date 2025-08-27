import React from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioPageHeader } from './index';
import { StudioParagraph } from '../StudioParagraph';
import { type StudioProfileMenuGroup } from './StudioPageHeaderProfileMenu';
import { StudioAvatar } from '../StudioAvatar';
import { StudioPopover } from '../StudioPopover';

const profileMenuGroups: StudioProfileMenuGroup[] = [
  {
    items: [
      {
        action: { type: 'button', onClick: (): void => {} },
        itemName: 'Item 1',
        isActive: true,
      },
      {
        action: { type: 'link', href: '' },
        itemName: 'Item 2',
      },
    ],
  },
  {
    items: [
      {
        action: { type: 'button', onClick: (): void => {} },
        itemName: 'Item 3',
      },
    ],
  },
];

const PreviewComponent = (args): React.ReactElement => (
  <StudioPageHeader {...args}>
    <StudioPageHeader.Main>
      <StudioPageHeader.Left title='Left' showTitle={false} />
      <StudioPageHeader.Center>
        <StudioPageHeader.HeaderButton
          color={args.variant === 'regular' ? 'light' : 'dark'}
          variant={args.variant}
        >
          Button
        </StudioPageHeader.HeaderButton>
      </StudioPageHeader.Center>
      <StudioPageHeader.Right>
        <div style={{ marginLeft: '10px' }}>
          <StudioPageHeader.ProfileMenu
            triggerButtonText='Triggerbutton text'
            ariaLabelTriggerButton='Triggerbutton aria-label'
            color='dark'
            variant='regular'
            profileMenuGroups={profileMenuGroups}
            profileImage={<StudioAvatar />}
          />
        </div>
      </StudioPageHeader.Right>
    </StudioPageHeader.Main>
    <StudioPageHeader.Sub>
      <div style={{ padding: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <StudioParagraph data-size='sm' style={{ color: 'white' }}>
          <StudioPageHeader.HeaderButton
            color={args.variant === 'regular' ? 'dark' : 'light'}
            variant={args.variant}
          >
            Subheader Button
          </StudioPageHeader.HeaderButton>
        </StudioParagraph>
        <StudioPopover.TriggerContext>
          <StudioPageHeader.PopoverTrigger>Popover</StudioPageHeader.PopoverTrigger>
          <StudioPopover>Popover content</StudioPopover>
        </StudioPopover.TriggerContext>
      </div>
    </StudioPageHeader.Sub>
  </StudioPageHeader>
);

type Story = StoryFn<typeof StudioPageHeader>;

const meta: Meta = {
  title: 'Components/StudioPageHeader',
  component: PreviewComponent,
  argTypes: {
    variant: {
      control: 'radio',
      options: ['regular', 'preview'],
    },
  },
};
export const Preview: Story = (args): React.ReactElement => <PreviewComponent {...args} />;

Preview.args = {
  variant: 'regular',
};

export default meta;

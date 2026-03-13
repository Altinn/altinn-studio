import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioPageHeader } from './index';
import { StudioParagraph } from '../StudioParagraph';
import { type StudioProfileMenuGroup } from './StudioPageHeaderProfileMenu';
import { StudioAvatar } from '../StudioAvatar';

const profileMenuGroups: StudioProfileMenuGroup[] = [
  {
    items: [
      {
        action: { type: 'button', onClick: () => {} },
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
        action: { type: 'button', onClick: () => {} },
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
      <div style={{ padding: '10px' }}>
        <StudioParagraph size='sm' style={{ color: 'white' }}>
          <StudioPageHeader.HeaderButton
            color={args.variant === 'regular' ? 'dark' : 'light'}
            variant={args.variant}
          >
            Subheader Button
          </StudioPageHeader.HeaderButton>
        </StudioParagraph>
      </div>
    </StudioPageHeader.Sub>
  </StudioPageHeader>
);

const meta = {
  title: 'Components/StudioPageHeader',
  component: PreviewComponent,
  argTypes: {
    variant: {
      control: 'radio',
      options: ['regular', 'preview'],
    },
  },
} satisfies Meta<typeof PreviewComponent>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    variant: 'regular',
  },
};

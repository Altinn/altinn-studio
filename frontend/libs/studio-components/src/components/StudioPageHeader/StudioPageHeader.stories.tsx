import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { StudioPageHeader, StudioPageHeaderButton } from './index';
import { StudioParagraph } from '../StudioParagraph';

const PreviewComponent = (args): React.ReactElement => (
  <StudioPageHeader {...args}>
    <StudioPageHeader.Main>
      <StudioPageHeader.Left title='Left' showTitle={false} />
      <StudioPageHeader.Center>
        <StudioPageHeaderButton
          color={args.variant === 'regular' ? 'light' : 'dark'}
          variant={args.variant}
        >
          Button
        </StudioPageHeaderButton>
      </StudioPageHeader.Center>
      <StudioPageHeader.Right>
        <StudioParagraph size='sm' style={{ color: 'white', paddingLeft: '20px' }}>
          Right
        </StudioParagraph>
      </StudioPageHeader.Right>
    </StudioPageHeader.Main>
    <StudioPageHeader.Sub>
      <div style={{ padding: '10px' }}>
        <StudioParagraph size='sm' style={{ color: 'white' }}>
          <StudioPageHeaderButton
            color={args.variant === 'regular' ? 'dark' : 'light'}
            variant={args.variant}
          >
            Subheader Button
          </StudioPageHeaderButton>
        </StudioParagraph>
      </div>
    </StudioPageHeader.Sub>
  </StudioPageHeader>
);

type Story = StoryFn<typeof StudioPageHeader>;

const meta: Meta = {
  title: 'StudioPageHeader',
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

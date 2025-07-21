import React, { type ReactElement } from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioPageImageBackgroundContainer } from './StudioPageImageBackgroundContainer';

const ChildrenComponent = (): ReactElement => {
  return (
    <div
      style={{
        minWidth: '400px',
        height: '150px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      Children content
    </div>
  );
};

type Story = StoryFn<typeof StudioPageImageBackgroundContainer>;

const meta: Meta = {
  title: 'Components/StudioPageImageBackgroundContainer',
  component: StudioPageImageBackgroundContainer,
};
export const Preview: Story = (args): React.ReactElement => (
  <StudioPageImageBackgroundContainer {...args} />
);

Preview.args = {
  image: 'https://info.altinn.no/Static/img/illustration/illustrasjon_logginn_alt.svg',
  children: <ChildrenComponent />,
};

export default meta;

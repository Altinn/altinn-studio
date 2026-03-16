import React, { type ReactElement } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
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

const meta = {
  title: 'Components/StudioPageImageBackgroundContainer',
  component: StudioPageImageBackgroundContainer,
} satisfies Meta<typeof StudioPageImageBackgroundContainer>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    image: 'https://info.altinn.no/Static/img/illustration/illustrasjon_logginn_alt.svg',
    children: <ChildrenComponent />,
  },
};

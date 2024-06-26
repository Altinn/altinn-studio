import type { StoryFn, Meta } from '@storybook/react/*';
import React from 'react';
import { StudioResizableLayoutContainer } from './StudioResizableLayoutContainer/StudioResizableLayoutContainer';
import { StudioResizableLayoutElement } from './StudioResizableLayoutElement/StudioResizableLayoutElement';

type Story = StoryFn<typeof StudioResizableLayoutContainer>;

const meta: Meta = {
  title: 'Studio/StudioResizableLayoutContainer',
  component: StudioResizableLayoutContainer,
  argTypes: {
    icon: {
      control: false,
    },
  },
};
export const Preview: Story = (args): React.ReactElement => (
  <div>
    <StudioResizableLayoutContainer {...args} style={{ width: 500, height: 800 }}>
      <StudioResizableLayoutElement style={{ backgroundColor: '#A1A1A1' }}>
        <div>
          lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut
          labore et dolore magna aliqua
        </div>
      </StudioResizableLayoutElement>
      <StudioResizableLayoutElement>
        <StudioResizableLayoutContainer orientation='vertical' layoutId='nestedlayout'>
          <StudioResizableLayoutElement style={{ backgroundColor: '#C1C1C1' }}>
            <div>
              lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor
              incididunt ut labore et dolore magna aliqua
            </div>
          </StudioResizableLayoutElement>
          <StudioResizableLayoutElement style={{ backgroundColor: '#D1D1D1' }}>
            <div>
              lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor
              incididunt ut labore et dolore magna aliqua
            </div>
          </StudioResizableLayoutElement>
        </StudioResizableLayoutContainer>
      </StudioResizableLayoutElement>
    </StudioResizableLayoutContainer>
  </div>
);

Preview.args = {
  layoutId: 'storylayout',
  orientation: 'horizontal',
};
export default meta;

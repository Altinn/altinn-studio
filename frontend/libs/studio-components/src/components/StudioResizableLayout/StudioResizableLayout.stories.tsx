import type { StoryFn, Meta } from '@storybook/react/*';
import React from 'react';
import type { StudioResizableLayoutContainerProps } from './StudioResizableLayoutContainer/StudioResizableLayoutContainer';
import { StudioResizableLayoutContainer } from './StudioResizableLayoutContainer/StudioResizableLayoutContainer';
import { StudioResizableLayoutElement } from './StudioResizableLayoutElement/StudioResizableLayoutElement';

type PreviewProps = {
  topContainerOrientation: StudioResizableLayoutContainerProps['orientation'];
  subContainerOrientation: StudioResizableLayoutContainerProps['orientation'];
};

type Story = StoryFn<PreviewProps>;
const meta: Meta = {
  title: 'Components/StudioResizableLayoutContainer',
  component: StudioResizableLayoutContainer,
};

export const Preview: Story = (args): React.ReactElement => (
  <div>
    <StudioResizableLayoutContainer
      orientation={args.topContainerOrientation}
      style={{ width: 900, height: 800 }}
    >
      <StudioResizableLayoutElement style={{ backgroundColor: '#A1A1A1' }}>
        <div>
          lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut
          labore et dolore magna aliqua
        </div>
      </StudioResizableLayoutElement>
      <StudioResizableLayoutElement>
        <StudioResizableLayoutContainer orientation={args.subContainerOrientation}>
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
      <StudioResizableLayoutElement style={{ backgroundColor: '#F1F1F1' }}>
        <div>
          lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut
          labore et dolore magna aliqua
        </div>
      </StudioResizableLayoutElement>
    </StudioResizableLayoutContainer>
  </div>
);

// TODO: use group story

Preview.args = {
  topContainerOrientation: 'vertical',
  subContainerOrientation: 'horizontal',
};
export default meta;

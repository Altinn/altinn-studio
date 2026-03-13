import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioDragAndDrop } from './index';
import { StudioParagraph } from '../StudioParagraph';

const PreviewComponent = (): React.ReactElement => (
  <StudioDragAndDrop.Provider onAdd={() => {}} onMove={() => {}} rootId='1'>
    <StudioDragAndDrop.List>
      <StudioDragAndDrop.ListItem
        itemId='2'
        renderItem={() => (
          <StudioParagraph data-size='sm'>Preview is not available in Storybook.</StudioParagraph>
        )}
      />
    </StudioDragAndDrop.List>
  </StudioDragAndDrop.Provider>
);

const meta = {
  title: 'Components/StudioDragAndDrop',
  component: PreviewComponent,
  argTypes: {},
} satisfies Meta<typeof PreviewComponent>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};

import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioIconCard } from './';
import { StudioButton } from '../StudioButton';
import classes from './StudioIconCard.stories.module.css';
import { InformationIcon } from '@studio/icons';

const meta = {
  title: 'Components/StudioIconCard',
  component: StudioIconCard,
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof StudioIconCard>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    icon: <InformationIcon />,
    iconColor: 'blue',
    menuButtonTitle: 'More options',
    contextButtons: (
      <div className={classes.menu}>
        <StudioButton data-size='sm' variant='tertiary' fullWidth>
          Action one
        </StudioButton>
        <StudioButton data-size='sm' variant='tertiary' fullWidth>
          Action two
        </StudioButton>
      </div>
    ),
    children: (
      <div className={classes.content}>
        <div className={classes.title}>Card title</div>
        <div className={classes.desc}>Supporting content goes here.</div>
        <StudioButton variant='primary'>Go to...</StudioButton>
      </div>
    ),
  },
};

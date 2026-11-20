import type { ReactElement } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioCheckboxGroup, useStudioCheckboxGroup } from './';
import type { StudioCheckboxGroupProps } from './StudioCheckboxGroup';

type ArgsProps = StudioCheckboxGroupProps & {
  hasError?: boolean;
};

const ComposedComponent = (args: ArgsProps): ReactElement => {
  const options: string[] = ['option 1', 'option 2', 'option 3'];
  const { hasError = true } = args;

  const { getCheckboxProps, validationMessageProps, value } = useStudioCheckboxGroup({
    name: 'my-checkbox-group',
    value: [],
    error: hasError ? 'Du må velge et alternativ' : undefined,
  });

  return (
    <StudioCheckboxGroup {...args}>
      {options.map((option: string) => (
        <StudioCheckboxGroup.Item
          key={option}
          label={option}
          hasError={value.length === 0}
          getCheckboxProps={getCheckboxProps(option)}
        />
      ))}
      {value.length === 0 && (
        <StudioCheckboxGroup.Error validationMessageProps={validationMessageProps} />
      )}
    </StudioCheckboxGroup>
  );
};

const meta = {
  title: 'Components/StudioCheckboxGroup',
  component: ComposedComponent,
  argTypes: {
    hasError: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof ComposedComponent>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    legend: 'My label',
    description: 'My description',
    tagText: 'Required',
    required: true,
  },
};

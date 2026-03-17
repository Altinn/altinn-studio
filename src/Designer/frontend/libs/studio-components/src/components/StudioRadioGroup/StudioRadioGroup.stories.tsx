import React, { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioRadioGroup, useStudioRadioGroup } from './';
import type { StudioRadioGroupProps } from './StudioRadioGroup';

type ArgsProps = StudioRadioGroupProps & {
  hasError?: boolean;
};

const ComposedComponent = (args: ArgsProps): ReactElement => {
  const options: string[] = ['option 1', 'option 2', 'option 3'];

  const [hasError, setHasError] = useState<boolean>(args.hasError || false);

  const { getRadioProps, validationMessageProps, value } = useStudioRadioGroup({
    name: 'my-radio-group',
    value: '',
    error: hasError ? 'Du må velge et alternativ' : undefined,
  });

  useEffect(() => {
    if (value !== '') {
      setHasError(false);
    }
  }, [value]);

  return (
    <StudioRadioGroup {...args}>
      {options.map((option: string) => (
        <StudioRadioGroup.Item
          key={option}
          label={option}
          hasError={hasError}
          getRadioProps={getRadioProps(option)}
        />
      ))}
      {hasError && <StudioRadioGroup.Error validationMessageProps={validationMessageProps} />}
    </StudioRadioGroup>
  );
};

const meta = {
  title: 'Components/StudioRadioGroup',
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

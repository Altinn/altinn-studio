import React from 'react';
import type { ReactElement } from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioCheckboxGroup, useStudioCheckboxGroup } from './';

type ArgsProps = {
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
      <StudioCheckboxGroup.Heading
        label='My label'
        description='My description'
        tagText='Required'
        required={true}
      />
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

type Story = StoryFn<typeof ComposedComponent>;

const meta: Meta = {
  title: 'Components/StudioCheckboxGroup',
  component: ComposedComponent,
  argTypes: {
    hasError: {
      control: 'boolean',
    },
  },
};
export const Preview: Story = (args): ReactElement => <ComposedComponent {...args} />;

export default meta;

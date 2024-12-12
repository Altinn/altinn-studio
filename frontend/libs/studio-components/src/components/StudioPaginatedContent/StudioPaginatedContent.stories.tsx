import React, { type ChangeEvent, useState } from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { StudioPaginatedContent, type StudioPaginatedContentProps } from './StudioPaginatedContent';
import { StudioParagraph } from '../StudioParagraph';
import { StudioTextfield } from '../StudioTextfield';

type ChildrenProps = {
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  value: string;
};
const Children1 = ({ onChange, value }: ChildrenProps) => {
  return (
    <div>
      <StudioParagraph>Children 1</StudioParagraph>
      <StudioTextfield
        size='sm'
        label='Please enter the value "3" to proceed to the next page.'
        onChange={onChange}
        value={value}
      />
    </div>
  );
};

type Story = StoryFn<typeof StudioPaginatedContent>;

const meta: Meta = {
  title: 'Components/StudioPaginatedContent',
  component: StudioPaginatedContent,
  argTypes: {},
};

export const Preview: Story = () => {
  const [disableNext, setDisableNext] = useState(true);
  const [inputValue, setInputValue] = useState('');

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setInputValue(value);
    if (value === '3') {
      setDisableNext(false);
    } else {
      setDisableNext(true);
    }
  };

  const items: StudioPaginatedContentProps['items'] = [
    {
      children: <Children1 value={inputValue} onChange={handleInputChange} />,
      disableNext: disableNext,
    },
    {
      children: <StudioParagraph size='sm'>Children 2</StudioParagraph>,
      disableNext: false,
    },
    {
      children: <StudioParagraph size='sm'>Children 3</StudioParagraph>,
      disableNext: false,
    },
    {
      children: <StudioParagraph size='sm'>Children 4</StudioParagraph>,
      disableNext: false,
    },
  ];

  return <StudioPaginatedContent items={items} previousButtonText='Back' nextButtonText='Next' />;
};

export default meta;

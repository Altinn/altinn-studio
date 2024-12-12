import React, { useState } from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { StudioPaginatedContent, type StudioPaginatedContentProps } from './StudioPaginatedContent';

const ComplexChild = () => {
  const [inputValue, setInputValue] = useState('');

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setInputValue(value);
    if (value === '3') {
      // Do something
    }
  };

  return (
    <div>
      <p>Type the number 3 to unlock the Next button:</p>
      <input type='text' value={inputValue} onChange={handleInputChange} placeholder='Type here' />
    </div>
  );
};

const items: StudioPaginatedContentProps['items'] = [
  {
    children: <div>Children 1</div>,
    disableNext: false,
  },
  {
    children: <div>Children 2</div>,
    disableNext: false,
  },
  {
    children: <ComplexChild />,
    disableNext: true,
  },
  {
    children: <div>Children 4</div>,
    disableNext: false,
  },
];

type Story = StoryFn<typeof StudioPaginatedContent>;

const meta: Meta = {
  title: 'Components/StudioPaginatedContent',
  component: StudioPaginatedContent,
  argTypes: {},
};

export const Preview: Story = (args) => {
  return <StudioPaginatedContent {...args} />;
};

Preview.args = {
  items,
  previousButtonText: 'Forrige',
  nextButtonText: 'Neste',
};

export default meta;

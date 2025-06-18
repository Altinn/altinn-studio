import React, { type ChangeEvent, useState } from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioPaginatedContent } from './StudioPaginatedContent';
import { StudioParagraph } from '../StudioParagraph';
import { StudioTextfield } from '../StudioTextfield';
import { usePagination } from './hooks/usePagination';
import { type StudioPaginatedItem } from './types/StudioPaginatedItem';

type ChildrenProps = {
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  value: string;
};
const Children1 = ({ onChange, value }: ChildrenProps) => {
  return (
    <div>
      <StudioParagraph>Children 1</StudioParagraph>
      <StudioTextfield
        label='Please enter the value "3" to proceed to the next page.'
        onChange={onChange}
        value={value}
      />
    </div>
  );
};
const Children2 = () => <StudioParagraph size='sm'>Children 2</StudioParagraph>;
const Children3 = () => <StudioParagraph size='sm'>Children 3</StudioParagraph>;
const Children4 = () => <StudioParagraph size='sm'>Children 4</StudioParagraph>;

type Story = StoryFn<typeof StudioPaginatedContent>;

const meta: Meta = {
  title: 'Components/StudioPaginatedContent',
  component: StudioPaginatedContent,
  argTypes: {},
};

export const Preview: Story = () => {
  const [inputValue, setInputValue] = useState('');

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setInputValue(value);
  };

  const items: StudioPaginatedItem[] = [
    {
      pageContent: <Children1 key={1} value={inputValue} onChange={handleInputChange} />,
      validationRuleForNextButton: inputValue === '3',
    },
    {
      pageContent: <Children2 key={2} />,
    },
    {
      pageContent: <Children3 key={3} />,
    },
    {
      pageContent: <Children4 key={4} />,
    },
  ];
  const { currentPage, pages, navigation } = usePagination(items);

  return (
    <StudioPaginatedContent
      navigationButtonTexts={{ previous: 'Previous', next: 'Next' }}
      componentToRender={pages[currentPage]}
      navigation={navigation}
      currentPageNumber={currentPage}
      totalPages={pages.length}
    />
  );
};

export default meta;

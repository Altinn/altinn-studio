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
const Children1 = ({ onChange, value }: ChildrenProps): React.JSX.Element => {
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

const SimpleChild = ({ text }: { text: string }): React.JSX.Element => (
  <StudioParagraph data-size='sm'>{text}</StudioParagraph>
);

type Story = StoryFn<typeof StudioPaginatedContent>;

const meta: Meta = {
  title: 'Components/StudioPaginatedContent',
  component: StudioPaginatedContent,
  argTypes: {},
};

export const Preview: Story = () => {
  const [inputValue, setInputValue] = useState('');

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const value = event.target.value;
    setInputValue(value);
  };

  const items: StudioPaginatedItem[] = [
    {
      pageContent: <Children1 key={1} value={inputValue} onChange={handleInputChange} />,
      validationRuleForNextButton: inputValue === '3',
    },
    { pageContent: <SimpleChild key={2} text='Children 2' /> },
    { pageContent: <SimpleChild key={3} text='Children 3' /> },
    { pageContent: <SimpleChild key={4} text='Children 4' /> },
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

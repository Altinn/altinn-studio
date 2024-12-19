import React, { type ChangeEvent, type ReactNode, useState } from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { StudioPaginatedContent } from './StudioPaginatedContent';
import { StudioParagraph } from '../StudioParagraph';
import { StudioTextfield } from '../StudioTextfield';
import { useValidation } from './hooks/useValidation';
import { usePagination } from './hooks/usePagination';

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

  const pages: ReactNode[] = [
    <Children1 key={1} value={inputValue} onChange={handleInputChange} />,
    <Children2 key={2} />,
    <Children3 key={3} />,
    <Children4 key={4} />,
  ];

  const { currentPage, goNext, goPrevious, hasPreviousPage, hasNextPage } = usePagination(
    pages.length,
  );
  const { isValid } = useValidation(currentPage, [currentPage === 0 ? inputValue === '3' : true]);

  return (
    <StudioPaginatedContent
      previousButtonText='Previous'
      nextButtonText='Next'
      componentToRender={pages[currentPage]}
      canGoNext={hasNextPage && isValid}
      canGoPrevious={hasPreviousPage}
      onNext={goNext}
      onPrevious={goPrevious}
      currentPageNumber={currentPage}
      totalPages={pages.length}
    />
  );
};

export default meta;

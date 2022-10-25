import * as React from 'react';
import HeaderSizeSelectComponent from '../EditHeaderSize';
import type { HeaderSizeSelectProps } from '../EditHeaderSize';

export function HeaderEditModalContent({
  renderChangeId,
  component,
  language,
  textResources,
  handleTitleChange,
  handleUpdateHeaderSize,
}: HeaderSizeSelectProps) {
  return (
    <HeaderSizeSelectComponent
      renderChangeId={renderChangeId}
      component={component}
      language={language}
      textResources={textResources}
      handleTitleChange={handleTitleChange}
      handleUpdateHeaderSize={handleUpdateHeaderSize}
    />
  );
}

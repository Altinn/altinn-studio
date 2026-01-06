import React from 'react';
import { StudioCodeFragment, StudioTextarea } from '@studio/components';
import classes from './StudioTextResourceValueEditor.module.css';
import { useAutoSizeTextArea } from '@studio/components/src/hooks/useAutoSizeTextArea';

export type StudioTextResourceValueEditorProps = {
  textResourceId: string;
  onTextChange?: (value: string) => void;
  textResourceValue?: string;
  ariaLabel: string;
  idLabel: string;
};

export const StudioTextResourceValueEditor = ({
  textResourceId,
  onTextChange,
  textResourceValue,
  ariaLabel,
  idLabel,
}: StudioTextResourceValueEditorProps): React.ReactElement => {
  const minHeightInPx = 100;
  const maxHeightInPx = 400;
  const displayValue = textResourceValue ?? '';
  const textareaRef = useAutoSizeTextArea(displayValue, {
    minHeightInPx,
    maxHeightInPx,
  });

  const handleTextEntryChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    onTextChange?.(e.currentTarget.value);
  };

  return (
    <div className={classes.root}>
      <StudioTextarea
        aria-label={ariaLabel}
        value={displayValue}
        onChange={handleTextEntryChange}
        ref={textareaRef}
      />
      <div className={classes.id}>
        {idLabel} <StudioCodeFragment>{textResourceId}</StudioCodeFragment>
      </div>
    </div>
  );
};

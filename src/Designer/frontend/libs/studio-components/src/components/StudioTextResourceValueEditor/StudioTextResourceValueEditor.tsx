import type { HTMLAttributes, Ref } from 'react';
import React, { forwardRef } from 'react';
import { StudioCodeFragment, StudioTextarea } from '@studio/components';
import classes from './StudioTextResourceValueEditor.module.css';
import { useAutoSizeTextArea } from '../../hooks/useAutoSizeTextArea';
import type { Override } from '../../types/Override';

export type StudioTextResourceValueEditorProps = Override<
  {
    textResourceId: string;
    onTextChange?: (value: string) => void;
    textResourceValue?: string;
    ariaLabel: string;
    idLabel: string;
  },
  Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'children'>
>;

function StudioTextResourceValueEditor(
  {
    textResourceId,
    onTextChange,
    textResourceValue,
    ariaLabel,
    idLabel,
    ...rest
  }: StudioTextResourceValueEditorProps,
  ref: Ref<HTMLDivElement>,
): React.ReactElement {
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
    <div {...rest} ref={ref} className={classes.root}>
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
}

const ForwardedStudioTextResourceValueEditor = forwardRef(StudioTextResourceValueEditor);

ForwardedStudioTextResourceValueEditor.displayName = 'StudioTextResourceValueEditor';

export { ForwardedStudioTextResourceValueEditor as StudioTextResourceValueEditor };

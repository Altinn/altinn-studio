import { forwardRef, useId, useState } from 'react';
import type { ChangeEvent, HTMLAttributes, ReactElement, Ref } from 'react';
import cn from 'classnames';
import { usePropState } from '@studio/hooks';
import { StudioLabel } from '../StudioLabel';
import { StudioToggleGroup } from '../StudioToggleGroup';
import { PreviewEditor } from './PreviewEditor';
import type { StudioMarkdownEditorMode } from './types/StudioMarkdownEditorMode';
import type { StudioMarkdownEditorTexts } from './types/StudioMarkdownEditorTexts';
import classes from './StudioMarkdownEditor.module.css';

export type StudioMarkdownEditorProps = {
  defaultMode?: StudioMarkdownEditorMode;
  label: string;
  onChange?: (markdown: string) => void;
  texts: StudioMarkdownEditorTexts;
  value?: string;
} & Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'>;

function StudioMarkdownEditor(
  {
    className,
    defaultMode = 'preview',
    label,
    onChange,
    texts,
    value = '',
    ...rest
  }: StudioMarkdownEditorProps,
  ref: Ref<HTMLDivElement>,
): ReactElement {
  const [markdown, setMarkdown] = usePropState<string>(value);
  const [mode, setMode] = useState<StudioMarkdownEditorMode>(defaultMode);
  const labelId = useId();
  const editorId = useId();

  const handleChange = (newMarkdown: string): void => {
    setMarkdown(newMarkdown);
    onChange?.(newMarkdown);
  };

  const handleSourceChange = (event: ChangeEvent<HTMLTextAreaElement>): void =>
    handleChange(event.target.value);

  return (
    <div className={cn(classes.markdownEditor, className)} ref={ref} {...rest}>
      <div className={classes.header}>
        <StudioLabel htmlFor={mode === 'markdown' ? editorId : undefined} id={labelId}>
          {label}
        </StudioLabel>
        <StudioToggleGroup
          aria-label={texts.modeSelectorLabel}
          data-size='sm'
          onChange={(newMode) => setMode(newMode as StudioMarkdownEditorMode)}
          value={mode}
        >
          <StudioToggleGroup.Item value='preview'>{texts.previewMode}</StudioToggleGroup.Item>
          <StudioToggleGroup.Item value='markdown'>{texts.markdownMode}</StudioToggleGroup.Item>
        </StudioToggleGroup>
      </div>
      <div className={classes.editorFrame}>
        {mode === 'preview' ? (
          <PreviewEditor
            editorId={editorId}
            labelId={labelId}
            onChange={handleChange}
            texts={texts}
            value={markdown}
          />
        ) : (
          <textarea
            className={classes.source}
            id={editorId}
            onChange={handleSourceChange}
            spellCheck={false}
            value={markdown}
          />
        )}
      </div>
    </div>
  );
}

const ForwardedStudioMarkdownEditor = forwardRef(StudioMarkdownEditor);

export { ForwardedStudioMarkdownEditor as StudioMarkdownEditor };

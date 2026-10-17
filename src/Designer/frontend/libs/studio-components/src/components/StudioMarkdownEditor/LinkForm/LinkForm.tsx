import { useState } from 'react';
import type { FormEvent, KeyboardEvent, ReactElement } from 'react';
import { StudioButton } from '../../StudioButton';
import { StudioTextfield } from '../../StudioTextfield';
import type { StudioMarkdownEditorTexts } from '../types/StudioMarkdownEditorTexts';
import { normalizeLinkUrl } from './normalizeLinkUrl';
import classes from './LinkForm.module.css';

export type LinkFormProps = {
  initialUrl: string;
  onApply: (url: string) => void;
  onRemove: () => void;
  onCancel: () => void;
  texts: StudioMarkdownEditorTexts;
};

export function LinkForm({
  initialUrl,
  onApply,
  onRemove,
  onCancel,
  texts,
}: LinkFormProps): ReactElement {
  const [url, setUrl] = useState<string>(initialUrl);
  const normalizedUrl = normalizeLinkUrl(url);
  const isExistingLink = initialUrl !== '';

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (normalizedUrl) onApply(normalizedUrl);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLFormElement>): void => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    onCancel();
  };

  return (
    <form className={classes.linkForm} onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
      <StudioTextfield
        autoFocus
        className={classes.urlField}
        data-size='sm'
        label={texts.linkUrl}
        onChange={(event) => setUrl(event.target.value)}
        inputMode='url'
        value={url}
      />
      <div className={classes.actions}>
        <StudioButton data-size='sm' disabled={!normalizedUrl} type='submit'>
          {texts.linkApply}
        </StudioButton>
        {isExistingLink && (
          <StudioButton data-size='sm' onClick={onRemove} type='button' variant='secondary'>
            {texts.linkRemove}
          </StudioButton>
        )}
        <StudioButton data-size='sm' onClick={onCancel} type='button' variant='tertiary'>
          {texts.linkCancel}
        </StudioButton>
      </div>
    </form>
  );
}

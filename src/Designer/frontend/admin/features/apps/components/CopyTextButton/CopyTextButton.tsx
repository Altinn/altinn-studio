import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { StudioButton } from '@studio/components';
import { FilesIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';

/** How long the button says "copied" before it offers to copy again. */
const COPIED_FEEDBACK_MS = 2_000;

export type CopyTextButtonProps = {
  text: string;
  /** What the button offers to copy, as its label. */
  label: string;
};

/**
 * Copies `text` to the clipboard and says so for a moment. Renders nothing where the clipboard
 * API is missing (an insecure origin), rather than a button that does nothing.
 */
export const CopyTextButton = ({ text, label }: CopyTextButtonProps): ReactElement | null => {
  const { t } = useTranslation();
  const [isCopied, setIsCopied] = useState(false);
  const feedbackTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(feedbackTimer.current), []);

  if (!navigator.clipboard) {
    return null;
  }

  const copy = async (): Promise<void> => {
    await navigator.clipboard.writeText(text);
    setIsCopied(true);
    window.clearTimeout(feedbackTimer.current);
    feedbackTimer.current = window.setTimeout(() => setIsCopied(false), COPIED_FEEDBACK_MS);
  };

  return (
    <StudioButton data-size='sm' variant='tertiary' icon={<FilesIcon aria-hidden />} onClick={copy}>
      {isCopied ? t('admin.workflows.error.copied') : label}
    </StudioButton>
  );
};

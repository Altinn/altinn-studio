import { useEffect, useRef, useState } from 'react';

import { Button } from '@app/form-component/app-components/Button';
import { Spinner } from '@app/form-component/app-components/Spinner';
import { Dialog, Heading } from '@digdir/designsystemet-react';
import { FilePdfIcon } from '@navikt/aksel-icons';
import type { ButtonColor, ButtonVariant } from '@app/form-component/app-components/Button';

import classes from './PDFPreviewControls.module.css';

export type PDFPreviewButtonStyle = 'primary' | 'secondary';

export type PDFPreviewGenerateResult =
  | { type: 'success'; blob: Blob }
  | { type: 'error'; message: string };

const buttonStyles: {
  [style in PDFPreviewButtonStyle]: { color: ButtonColor; variant: ButtonVariant };
} = {
  primary: { variant: 'primary', color: 'second' },
  secondary: { variant: 'secondary', color: 'second' },
};

export interface PDFPreviewControlsProps {
  title: string;
  errorHeading: string;
  loadingLabel: string;
  buttonStyle?: PDFPreviewButtonStyle;
  disabled?: boolean;
  showErrorDetails?: boolean;
  onGenerate: (signal: AbortSignal) => Promise<PDFPreviewGenerateResult>;
}

export function PDFPreviewControls({
  title,
  errorHeading,
  loadingLabel,
  buttonStyle = 'secondary',
  disabled = false,
  showErrorDetails = false,
  onGenerate,
}: PDFPreviewControlsProps) {
  const modalRef = useRef<HTMLDialogElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const { color, variant } = buttonStyles[buttonStyle];

  useEffect(() => {
    if (!blobUrl) {
      return;
    }
    return () => URL.revokeObjectURL(blobUrl);
  }, [blobUrl]);

  async function handleClick() {
    if (disabled) {
      return;
    }

    setBlobUrl(null);
    setErrorText(null);
    setIsOpen(true);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    modalRef.current?.showModal();

    const result = await onGenerate(controller.signal);
    if (abortRef.current !== controller) {
      return;
    }
    if (result.type === 'error') {
      setErrorText(result.message);
      return;
    }
    setBlobUrl(URL.createObjectURL(result.blob));
  }

  return (
    <>
      <Button onClick={handleClick} disabled={disabled} color={color} variant={variant}>
        <FilePdfIcon fontSize='1rem' aria-hidden />
        {title}
      </Button>
      <Dialog
        ref={modalRef}
        onClose={() => {
          abortRef.current?.abort();
          setIsOpen(false);
        }}
        closedby='any'
        className={classes.modal}
      >
        {isOpen &&
          (blobUrl ? (
            <iframe className={classes.iframe} title='Preview' src={blobUrl} />
          ) : errorText ? (
            <div style={{ textAlign: 'center' }}>
              <Heading>{errorHeading}</Heading>
              {showErrorDetails &&
                errorText.split('\n').map((line) => (
                  <span key={line}>
                    {line}
                    <br />
                  </span>
                ))}
            </div>
          ) : (
            <div className={classes.loading}>
              <Spinner aria-label={loadingLabel} data-size='xl' />
            </div>
          ))}
      </Dialog>
    </>
  );
}

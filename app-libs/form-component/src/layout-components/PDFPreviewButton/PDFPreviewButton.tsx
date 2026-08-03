import { useEffect, useRef, useState } from 'react';

import { Button } from '@app/form-component/app-components/Button';
import { Spinner } from '@app/form-component/app-components/Spinner';
import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { ComponentStructure } from '@app/form-component/layout-components/common/ComponentStructure';
import { Dialog, Heading } from '@digdir/designsystemet-react';
import { FilePdfIcon } from '@navikt/aksel-icons';
import type { ButtonColor, ButtonVariant } from '@app/form-component/app-components/Button';
import type { IGridStyling } from '@app/form-component/app-components/Flex';

import classes from './PDFPreviewButton.module.css';

export type PDFPreviewButtonStyle = 'primary' | 'secondary';

export type PDFPreviewGenerateResult =
  | { type: 'success'; blob: Blob }
  | { type: 'error'; message: string };

const buttonStyles: {
  [style in PDFPreviewButtonStyle]: { color: ButtonColor; variant: ButtonVariant };
} = {
  primary: { variant: 'primary', color: 'success' },
  secondary: { variant: 'secondary', color: 'second' },
};

export interface PDFPreviewControlsProps {
  title?: string;
  buttonStyle?: PDFPreviewButtonStyle;
  disabled?: boolean;
  showErrorDetails?: boolean;
  onGenerate: (signal: AbortSignal) => Promise<PDFPreviewGenerateResult>;
}

export function PDFPreviewControls({
  title = 'pdfPreview.defaultButtonText',
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
  const { langAsString } = useTranslation();
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

    try {
      const result = await onGenerate(controller.signal);
      if (abortRef.current !== controller) {
        return;
      }
      if (result.type === 'error') {
        setErrorText(result.message);
        return;
      }
      setBlobUrl(URL.createObjectURL(result.blob));
    } catch (error) {
      if (abortRef.current !== controller || controller.signal.aborted) {
        return;
      }
      setErrorText(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <>
      <Button onClick={handleClick} disabled={disabled} color={color} variant={variant}>
        <FilePdfIcon fontSize='1rem' aria-hidden />
        {langAsString(title)}
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
              <Heading>{langAsString('pdfPreview.error')}</Heading>
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
              <Spinner aria-label={langAsString('general.loading')} data-size='xl' />
            </div>
          ))}
      </Dialog>
    </>
  );
}

export interface PDFPreviewButtonProps extends PDFPreviewControlsProps {
  componentId: string;
  innerGrid?: IGridStyling;
}

export function PDFPreviewButton({
  componentId,
  innerGrid,
  ...controlsProps
}: PDFPreviewButtonProps) {
  return (
    <ComponentStructure componentId={componentId} innerGrid={innerGrid}>
      <PDFPreviewControls {...controlsProps} />
    </ComponentStructure>
  );
}

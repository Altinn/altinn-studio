import React from 'react';

import { Dialog, Heading, Spinner } from '@digdir/designsystemet-react';
import { FilePdfIcon } from '@navikt/aksel-icons';

import { Button } from 'src/app-components/Button/Button';
import classes from 'src/features/devtools/components/PDFPreviewButton/PDFPreview.module.css';
import { useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useLanguage } from 'src/features/language/useLanguage';
import { getPdfPreviewUrl } from 'src/utils/urls/appUrlHelper';

export function PDFGeneratorPreview({
  buttonTitle,
  showErrorDetails,
}: {
  buttonTitle?: string;
  showErrorDetails?: boolean;
}) {
  const modalRef = React.useRef<HTMLDialogElement>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  const [blobUrl, setBlobUrl] = React.useState<string | null>(null);
  const [errorText, setErrorText] = React.useState<string | null>(null);

  const instanceId = useLaxInstanceId();
  const language = useCurrentLanguage();
  const disabled = !instanceId;

  const { langAsString } = useLanguage();

  async function generatePDF() {
    if (disabled) {
      return;
    }

    setBlobUrl(null);
    setErrorText(null);
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    modalRef.current?.showModal();

    const response: Response | Error = await fetch(getPdfPreviewUrl(instanceId, language), {
      signal: abortRef.current?.signal,
      headers: { Pragma: 'no-cache' },
    }).catch((error) => error);

    if (response instanceof Error) {
      setErrorText(response.message);
      return;
    }

    if (response.status !== 200 || response.headers.get('Content-Type') !== 'application/pdf') {
      const text = await response.text();
      setErrorText(`${response.status} ${response.statusText}\n${text}`);
      return;
    }
    const blob = await response.blob();
    setBlobUrl(URL.createObjectURL(blob));
  }

  return (
    <>
      <Button
        onClick={generatePDF}
        disabled={disabled}
        color='second'
      >
        <FilePdfIcon
          fontSize='1rem'
          aria-hidden
        />
        {buttonTitle ? langAsString(buttonTitle) : langAsString('pdfPreview.defaultButtonText')}
      </Button>
      <Dialog
        ref={modalRef}
        onClose={() => abortRef.current?.abort()}
        closedby='any'
        className={classes.modal}
      >
        {blobUrl ? (
          <iframe
            className={classes.iframe}
            title='Preview'
            src={blobUrl}
          />
        ) : errorText ? (
          <div style={{ textAlign: 'center' }}>
            <Heading id='pdfPreview.error' />
            {showErrorDetails &&
              errorText.split('\n').map((line) => (
                <React.Fragment key={line}>
                  {line}
                  <br />
                </React.Fragment>
              ))}
          </div>
        ) : (
          <div className={classes.loading}>
            <Spinner
              aria-label={langAsString('general.loading')}
              data-size='xl'
            />
          </div>
        )}
      </Dialog>
    </>
  );
}

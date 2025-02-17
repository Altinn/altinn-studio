import React from 'react';

import { Modal, Spinner } from '@digdir/designsystemet-react';
import { FilePdfIcon } from '@navikt/aksel-icons';

import { Button } from 'src/app-components/Button/Button';
import classes from 'src/features/devtools/components/PDFPreviewButton/PDFPreview.module.css';
import { useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { useTaskTypeFromBackend } from 'src/features/instance/ProcessContext';
import { Lang } from 'src/features/language/Lang';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useLanguage } from 'src/features/language/useLanguage';
import { ProcessTaskType } from 'src/types';
import { isLocalOrStaging } from 'src/utils/isDev';
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

  const taskType = useTaskTypeFromBackend();
  const instanceId = useLaxInstanceId();
  const language = useCurrentLanguage();

  const disabled = taskType !== ProcessTaskType.Data || !instanceId || !isLocalOrStaging();

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
      <Modal
        ref={modalRef}
        onClose={() => abortRef.current?.abort()}
        onInteractOutside={() => modalRef.current?.close()}
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
            <Modal.Header>
              <Lang id='pdfPreview.error' />
            </Modal.Header>
            <Modal.Content>
              {showErrorDetails &&
                errorText.split('\n').map((line) => (
                  <React.Fragment key={line}>
                    {line}
                    <br />
                  </React.Fragment>
                ))}
            </Modal.Content>
          </div>
        ) : (
          <div className={classes.loading}>
            <Spinner
              title={langAsString('general.loading')}
              size='xlarge'
            />
          </div>
        )}
      </Modal>
    </>
  );
}

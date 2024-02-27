import React from 'react';

import { Button, Modal, Spinner } from '@digdir/design-system-react';
import { FilePdfIcon } from '@navikt/aksel-icons';

import classes from 'src/features/devtools/components/PDFPreviewButton/PDFPreview.module.css';
import { useLaxInstance } from 'src/features/instance/InstanceContext';
import { useTaskTypeFromBackend } from 'src/features/instance/ProcessContext';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useIsLocalOrStaging } from 'src/hooks/useIsDev';
import { ProcessTaskType } from 'src/types';
import { getPdfPreviewUrl } from 'src/utils/urls/appUrlHelper';

export function PDFGeneratorPreview() {
  const modalRef = React.useRef<HTMLDialogElement>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  const [blobUrl, setBlobUrl] = React.useState<string | null>(null);
  const [errorText, setErrorText] = React.useState<string | null>(null);

  const taskType = useTaskTypeFromBackend();
  const instanceId = useLaxInstance()?.data?.id;
  const language = useCurrentLanguage();
  const isLocalOrStaging = useIsLocalOrStaging();

  const disabled = taskType !== ProcessTaskType.Data || !instanceId || !isLocalOrStaging;

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
        size='small'
        disabled={disabled}
        color='second'
      >
        {<FilePdfIcon aria-hidden />}
        Generer PDF
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
          <>
            <Modal.Header>PDF-generering feilet</Modal.Header>
            <Modal.Content>
              {errorText.split('\n').map((line) => (
                <>
                  {line}
                  <br />
                </>
              ))}
            </Modal.Content>
          </>
        ) : (
          <div className={classes.loading}>
            <Spinner
              title='Laster...'
              size='xlarge'
            />
          </div>
        )}
      </Modal>
    </>
  );
}

import React, { useState } from 'react';

import { Alert, Button } from '@digdir/designsystemet-react';
import { XMarkIcon } from '@navikt/aksel-icons';
import { isAxiosError } from 'axios';

import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { type IFailedAttachment, isDataPostError } from 'src/features/attachments';
import { useDeleteFailedAttachment, useFailedAttachmentsFor } from 'src/features/attachments/hooks';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { getValidationIssueMessage } from 'src/features/validation/backendValidation/backendValidationUtils';
import classes from 'src/layout/FileUpload/Error/FailedAttachments.module.css';
import { isRejectedFileError } from 'src/layout/FileUpload/RejectedFileError';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';

export function FailedAttachments({ baseComponentId }: { baseComponentId: string }) {
  const failedAttachments = useFailedAttachmentsFor(baseComponentId);
  const deleteFailedAttachment = useDeleteFailedAttachment();
  const indexedId = useIndexedId(baseComponentId);

  return failedAttachments.length > 0 ? (
    <div className={classes.list}>
      {failedAttachments.map((attachment) => (
        <FileUploadError
          key={attachment.data.temporaryId}
          attachment={attachment}
          handleClose={() => deleteFailedAttachment(indexedId, attachment.data.temporaryId)}
        />
      ))}
    </div>
  ) : null;
}

function FileUploadError({ attachment, handleClose }: { attachment: IFailedAttachment; handleClose: () => void }) {
  const { langAsString } = useLanguage();
  return (
    <Alert
      data-size='sm'
      data-color='danger'
      role='alert'
      aria-live='assertive'
      aria-label={langAsString('form_filler.file_uploader_failed_to_upload_file', [attachment.data.filename])}
    >
      <div className={classes.container}>
        <div className={classes.wrapper}>
          <span className={classes.title}>
            <Lang
              id='form_filler.file_uploader_failed_to_upload_file'
              params={[truncateFileName(attachment.data.filename, 10, 10), attachment.data.filename]}
            />
          </span>
          <div className={classes.content}>
            <ErrorDetails attachment={attachment} />
          </div>
        </div>
        <Button
          className={classes.closeButton}
          variant='tertiary'
          color='second'
          onClick={handleClose}
          aria-label={langAsString('general.close')}
        >
          <XMarkIcon
            fontSize='1rem'
            aria-hidden='true'
          />
        </Button>
      </div>
    </Alert>
  );
}

function ErrorDetails({ attachment: { data, error } }: { attachment: IFailedAttachment }) {
  const backendFeatures = useApplicationMetadata().features ?? {};
  const [showingMore, setShowingMore] = useState(false);

  if (isAxiosError(error)) {
    const reply = error.response?.data;
    const issues = isDataPostError(reply)
      ? reply.uploadValidationIssues
      : backendFeatures.jsonObjectInDataResponse && Array.isArray(reply) // This is the old API response
        ? reply
        : null;

    if (issues && issues.length === 1) {
      const { key, params } = getValidationIssueMessage(issues[0]);
      return (
        <Lang
          id={key}
          params={params}
        />
      );
    }
    if (issues && issues.length > 1) {
      const isLong = issues.length > MAX_ITEMS_BEFORE_COLLAPSE;
      const showFull = !isLong || showingMore;
      const howManyMore = issues.length - MAX_ITEMS_BEFORE_COLLAPSE;
      const buttonId = `attachment-error-button-${data.temporaryId}`;

      const params = (showFull ? issues : issues.slice(0, MAX_ITEMS_BEFORE_COLLAPSE)).map((issue) =>
        getValidationIssueMessage(issue),
      );
      const message = params.map((_, i) => `- {${i}}`).join('\n');

      return (
        <>
          <Lang
            id={message}
            params={params}
          />
          {isLong && (
            <Button
              id={buttonId}
              style={{ marginTop: '0.5rem' }}
              data-size='sm'
              variant='tertiary'
              color='second'
              onClick={() => {
                if (!showingMore) {
                  setShowingMore(true);
                } else {
                  setShowingMore(false);
                  requestAnimationFrame(() =>
                    document.querySelector(`#${buttonId}`)?.scrollIntoView({ behavior: 'instant', block: 'nearest' }),
                  );
                }
              }}
            >
              {showingMore ? (
                <Lang id='form_filler.file_uploader_show_fewer_errors' />
              ) : (
                <Lang
                  id='form_filler.file_uploader_show_more_errors'
                  params={[howManyMore]}
                />
              )}
            </Button>
          )}
        </>
      );
    }
  }

  if (isRejectedFileError(error)) {
    const { file, errors } = error.data.rejection;
    window.logWarn(`Failed to upload attachment "${file.name}" of type "${file.type}":`);
    for (const err of errors) {
      window.logWarn(`- ${err.message}`);
    }

    if (error.data.rejection.file.size > error.data.maxFileSizeInMB * bytesInOneMB) {
      return (
        <Lang
          id='form_filler.file_uploader_validation_error_file_size'
          params={[error.data.rejection.file.name]}
        />
      );
    } else {
      return (
        <Lang
          id='form_filler.file_uploader_validation_error_general'
          params={[error.data.rejection.file.name]}
        />
      );
    }
  }

  return <Lang id='form_filler.file_uploader_validation_error_upload' />;
}

const MAX_ITEMS_BEFORE_COLLAPSE = 3;
const bytesInOneMB = 1048576;

function truncateFileName(fileName: string, startCount: number, endCount: number) {
  const pos = fileName.lastIndexOf('.');
  const extension = pos > -1 ? fileName.slice(pos) : undefined;
  const name = pos > -1 ? fileName.slice(0, pos) : fileName;

  if (name.length <= startCount + endCount + 3) {
    return fileName;
  }

  return `${name.slice(0, startCount)}...${name.slice(-endCount)}${extension}`;
}

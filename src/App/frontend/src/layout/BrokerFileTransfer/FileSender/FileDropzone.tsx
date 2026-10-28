import React from 'react';
import type { FileRejection } from 'react-dropzone';

import {
  Dropzone,
  getDescriptionId,
  getLabelId,
  mapExtensionToAcceptMime,
  useIsMobileOrTablet,
} from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';
import { CloudUpIcon } from '@navikt/aksel-icons';

import { Lang } from 'src/features/language/Lang';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useLanguage } from 'src/features/language/useLanguage';
import classes from 'src/layout/BrokerFileTransfer/FileSender/FileDropzone.module.css';
import { formatFileSize } from 'src/layout/BrokerFileTransfer/messages';
import { useAllowedFileEndings } from 'src/layout/BrokerFileTransfer/useBrokerSetup';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalOptionalText } from 'src/utils/layout/useEvalExpression';

// The shared Dropzone counts a MB as 1,048,576 bytes
const DROPZONE_BYTES_IN_MB = 1048576;

type FileDropzoneProps = {
  baseComponentId: string;
  maxFileSize: number | null;
  hasError: boolean;
  onDrop: (accepted: File[], rejected: FileRejection[]) => void;
};

export function FileDropzone({ baseComponentId, maxFileSize, hasError, onDrop }: FileDropzoneProps) {
  const config = useComponentConfig(baseComponentId, 'BrokerFileTransfer');
  const componentId = useIndexedId(baseComponentId);
  const language = useCurrentLanguage();
  const { langAsString } = useLanguage();
  const title = useEvalOptionalText(
    config.textResourceBindings?.title,
    Expressions.BrokerFileTransfer.textResourceBindings.title,
  );
  const description = useEvalOptionalText(
    config.textResourceBindings?.description,
    Expressions.BrokerFileTransfer.textResourceBindings.description,
  );
  const allowedFileEndings = useAllowedFileEndings(baseComponentId);
  const mobileView = useIsMobileOrTablet();
  const formatsId = `broker-file-transfer-formats-${componentId}`;

  return (
    <>
      <Dropzone
        id={componentId}
        readOnly={false}
        onDrop={onDrop}
        acceptedFiles={allowedFileEndings ? mapExtensionToAcceptMime(allowedFileEndings) : undefined}
        maxFileSize={
          maxFileSize === null
            ? undefined
            : {
                sizeInMB: maxFileSize / DROPZONE_BYTES_IN_MB,
                text: langAsString('broker_file_transfer.max_size', [formatFileSize(maxFileSize, language)]),
              }
        }
        hasValidationMessages={hasError}
        labelId={title ? getLabelId(componentId) : undefined}
        describedBy={[description ? getDescriptionId(componentId) : undefined, formatsId].filter(Boolean).join(' ')}
      >
        <div className={classes.content}>
          <CloudUpIcon
            aria-hidden
            className={classes.uploadIcon}
          />
          {/* Files can't be dragged on phones and tablets, so they only choose one there, as in file upload */}
          <b>
            {mobileView ? (
              <span className={classes.find}>
                <Lang id='broker_file_transfer.choose_file' />
              </span>
            ) : (
              <>
                <Lang id='form_filler.file_uploader_drag' />{' '}
                <span className={classes.find}>
                  <Lang id='form_filler.file_uploader_find' />
                </span>
              </>
            )}
          </b>
          <span id={formatsId}>
            <Lang id='form_filler.file_uploader_valid_file_format' />{' '}
            {allowedFileEndings ? (
              allowedFileEndings.join(', ')
            ) : (
              <Lang id='form_filler.file_upload_valid_file_format_all' />
            )}
          </span>
        </div>
      </Dropzone>
      {/* The file upload component's counter, shown until a file is chosen as it is there */}
      <small className={classes.counter}>
        <Lang
          id='form_filler.file_uploader_number_of_files'
          params={['0/1']}
        />
      </small>
    </>
  );
}

import React from 'react';

import { CheckmarkCircleFillIcon } from '@navikt/aksel-icons';

import { AltinnLoader } from 'src/components/AltinnLoader';
import { isAttachmentUploaded } from 'src/features/attachments';
import { useLanguage } from 'src/hooks/useLanguage';
import { AttachmentFileName } from 'src/layout/FileUpload/FileUploadTable/AttachmentFileName';
import { FileTableButtons } from 'src/layout/FileUpload/FileUploadTable/FileTableButtons';
import classes from 'src/layout/FileUpload/FileUploadTable/FileTableRow.module.css';
import { useFileTableRow } from 'src/layout/FileUpload/FileUploadTable/FileTableRowContext';
import { AltinnAppTheme } from 'src/theme/altinnAppTheme';
import type { IAttachment } from 'src/features/attachments';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

class IFileUploadTableRowProps {
  attachment: IAttachment;
  mobileView: boolean;
  node: LayoutNode<'FileUpload' | 'FileUploadWithTag'>;
  tagLabel: string | undefined;
}

export const bytesInOneMB = 1048576;

export function FileTableRow({ node, attachment, mobileView, tagLabel }: IFileUploadTableRowProps) {
  const { langAsString } = useLanguage();
  const hasTag = node.item.type === 'FileUploadWithTag';

  const readableSize = `${(attachment.data.size / bytesInOneMB).toFixed(2)} ${langAsString(
    'form_filler.file_uploader_mb',
  )}`;
  const uniqueId = isAttachmentUploaded(attachment) ? attachment.data.id : attachment.data.temporaryId;

  return (
    <tr
      key={uniqueId}
      className={classes.blueUnderlineDotted}
      id={`altinn-file-list-row-${uniqueId}`}
      tabIndex={0}
    >
      <NameCell
        attachment={attachment}
        mobileView={mobileView}
        readableSize={readableSize}
        hasTag={hasTag}
      />
      {hasTag && <FileTypeCell tagLabel={tagLabel} />}
      {!(hasTag && mobileView) && (
        <StatusCellContent
          uploaded={attachment.uploaded}
          mobileView={mobileView}
        />
      )}
      <ButtonCellContent
        node={node}
        attachment={attachment}
        deleting={attachment.deleting}
        mobileView={mobileView}
      />
    </tr>
  );
}

const NameCell = ({
  mobileView,
  attachment,
  readableSize,
  hasTag,
}: {
  mobileView: boolean;
  attachment: IAttachment;
  readableSize: string;
  hasTag: boolean;
}) => {
  const { langAsString } = useLanguage();
  const uniqueId = isAttachmentUploaded(attachment) ? attachment.data.id : attachment.data.temporaryId;
  return (
    <>
      <td>
        <div style={{ minWidth: '0px' }}>
          <AttachmentFileName
            attachment={attachment}
            mobileView={mobileView}
          />
          {mobileView && (
            <div
              style={{
                color: AltinnAppTheme.altinnPalette.primary.grey,
              }}
            >
              {attachment.uploaded ? (
                <div>
                  {readableSize}
                  {hasTag && (
                    <CheckmarkCircleFillIcon
                      aria-label={langAsString('form_filler.file_uploader_list_status_done')}
                      role='img'
                      style={{ marginLeft: '5px' }}
                    />
                  )}
                </div>
              ) : (
                <AltinnLoader
                  id={`attachment-loader-upload-${uniqueId}`}
                  className={classes.altinnLoader}
                  srContent={langAsString('general.loading')}
                />
              )}
            </div>
          )}
        </div>
      </td>
      {!mobileView ? <td>{readableSize}</td> : null}
    </>
  );
};

const FileTypeCell = ({ tagLabel }: { tagLabel: string | undefined }) => {
  const { langAsString } = useLanguage();
  const { index } = useFileTableRow();
  return <td key={`attachment-tag-${index}`}>{tagLabel && langAsString(tagLabel)}</td>;
};

const StatusCellContent = ({ uploaded, mobileView }) => {
  const { langAsString } = useLanguage();
  const status = uploaded
    ? langAsString('form_filler.file_uploader_list_status_done')
    : langAsString('general.loading');

  return (
    <td>
      {uploaded ? (
        <div className={classes.fileStatus}>
          {mobileView ? null : status}
          <CheckmarkCircleFillIcon
            data-testid='checkmark-success'
            style={mobileView ? { marginLeft: '10px' } : {}}
            aria-hidden={!mobileView}
            aria-label={status}
            role='img'
          />
        </div>
      ) : (
        <AltinnLoader
          id='loader-upload'
          className={classes.altinnLoader}
          srContent={status}
        />
      )}
    </td>
  );
};

interface IButtonCellContentProps {
  deleting: boolean;
  node: LayoutNode<'FileUpload' | 'FileUploadWithTag'>;
  mobileView: boolean;
  attachment: IAttachment;
}

const ButtonCellContent = ({ deleting, node, mobileView, attachment }: IButtonCellContentProps) => {
  const { langAsString } = useLanguage();

  if (deleting) {
    return (
      <td>
        <AltinnLoader
          id='loader-delete'
          className={classes.deleteLoader}
          srContent={langAsString('general.loading')}
        />
      </td>
    );
  }

  return (
    <td>
      <FileTableButtons
        node={node}
        mobileView={mobileView}
        attachment={attachment}
        editWindowIsOpen={false}
      />
    </td>
  );
};

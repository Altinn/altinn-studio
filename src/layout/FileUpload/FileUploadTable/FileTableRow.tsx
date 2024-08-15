import React from 'react';

import classNames from 'classnames';

import { AltinnLoader } from 'src/components/AltinnLoader';
import { isAttachmentUploaded } from 'src/features/attachments';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { usePdfModeActive } from 'src/features/pdf/PDFWrapper';
import { AttachmentFileName } from 'src/layout/FileUpload/FileUploadTable/AttachmentFileName';
import { FileTableButtons } from 'src/layout/FileUpload/FileUploadTable/FileTableButtons';
import classes from 'src/layout/FileUpload/FileUploadTable/FileTableRow.module.css';
import { useFileTableRow } from 'src/layout/FileUpload/FileUploadTable/FileTableRowContext';
import { EditButton } from 'src/layout/Summary2/CommonSummaryComponents/EditButton';
import { AltinnAppTheme } from 'src/theme/altinnAppTheme';
import type { IAttachment } from 'src/features/attachments';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

class IFileUploadTableRowProps {
  attachment: IAttachment;
  mobileView: boolean;
  node: LayoutNode<'FileUpload' | 'FileUploadWithTag'>;
  tagLabel: string | undefined;
  isSummary?: boolean;
}

export const bytesInOneMB = 1048576;

export function FileTableRow({ node, attachment, mobileView, tagLabel, isSummary }: IFileUploadTableRowProps) {
  const { langAsString } = useLanguage();
  const hasTag = node.item.type === 'FileUploadWithTag';
  const pdfModeActive = usePdfModeActive();
  const readableSize = `${(attachment.data.size / bytesInOneMB).toFixed(2)} ${langAsString(
    'form_filler.file_uploader_mb',
  )}`;

  const uniqueId = isAttachmentUploaded(attachment) ? attachment.data.id : attachment.data.temporaryId;

  const status = attachment.uploaded
    ? langAsString('form_filler.file_uploader_list_status_done')
    : langAsString('general.loading');

  const rowStyle =
    isSummary || pdfModeActive
      ? classNames(classes.noRowSpacing, classes.grayUnderlineDotted)
      : classes.blueUnderlineDotted;

  return (
    <tr
      key={uniqueId}
      className={rowStyle}
      id={`altinn-file-list-row-${uniqueId}`}
      tabIndex={0}
    >
      <NameCell
        attachment={attachment}
        mobileView={mobileView}
        readableSize={readableSize}
        hasTag={hasTag}
        uploadStatus={status}
        tagLabel={tagLabel}
      />
      {hasTag && !mobileView && <FileTypeCell tagLabel={tagLabel} />}
      {!(hasTag && mobileView) && !pdfModeActive && !mobileView && (
        <StatusCellContent
          status={status}
          mobileView={mobileView}
          uploaded={attachment.uploaded}
        />
      )}

      {!isSummary && (
        <ButtonCellContent
          node={node}
          attachment={attachment}
          deleting={attachment.deleting}
          mobileView={mobileView}
        />
      )}
      {isSummary && !pdfModeActive && (
        <td>
          <EditButton
            className={classes.marginLeftAuto}
            componentNode={node}
            summaryComponentId={''}
          />
        </td>
      )}
    </tr>
  );
}

const NameCell = ({
  mobileView,
  attachment,
  readableSize,
  hasTag,
  uploadStatus,
  tagLabel,
}: {
  mobileView: boolean;
  attachment: IAttachment;
  readableSize: string;
  hasTag: boolean;
  uploadStatus: string;
  tagLabel?: string;
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
                  {tagLabel && mobileView && (
                    <div>
                      <Lang id={tagLabel} />
                    </div>
                  )}
                  {`${readableSize} ${mobileView ? uploadStatus : ''}`}
                  {hasTag && !mobileView && (
                    <div data-testid='status-success'>
                      <Lang id={'form_filler.file_uploader_list_status_done'} />
                    </div>
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

const StatusCellContent = ({ uploaded, mobileView, status }) => (
  <td>
    {uploaded ? (
      <div data-testid='status-success'>{mobileView ? null : status}</div>
    ) : (
      <AltinnLoader
        id='loader-upload'
        className={classes.altinnLoader}
        srContent={status}
      />
    )}
  </td>
);

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

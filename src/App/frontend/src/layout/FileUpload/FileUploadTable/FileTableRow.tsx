import React from 'react';

import classNames from 'classnames';

import { AltinnLoader } from 'src/components/AltinnLoader';
import { useTaskOverrides } from 'src/core/contexts/TaskOverrides';
import { isAttachmentUploaded } from 'src/features/attachments';
import { FileScanResults } from 'src/features/attachments/types';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { usePdfModeActive } from 'src/features/pdf/PDFWrapper';
import { AttachmentFileName } from 'src/layout/FileUpload/FileUploadTable/AttachmentFileName';
import { FileTableButtons } from 'src/layout/FileUpload/FileUploadTable/FileTableButtons';
import classes from 'src/layout/FileUpload/FileUploadTable/FileTableRow.module.css';
import { useFileTableRow } from 'src/layout/FileUpload/FileUploadTable/FileTableRowContext';
import { EditButton } from 'src/layout/Summary2/CommonSummaryComponents/EditButton';
import { AltinnPalette } from 'src/theme/altinnAppTheme';
import { getSizeWithUnit } from 'src/utils/attachmentsUtils';
import { useExternalItem } from 'src/utils/layout/hooks';
import type { IAttachment } from 'src/features/attachments';

interface IFileUploadTableRowProps {
  attachment: IAttachment;
  mobileView: boolean;
  baseComponentId: string;
  tagLabel: string | undefined;
  isSummary?: boolean;
}

export function FileTableRow({
  baseComponentId,
  attachment,
  mobileView,
  tagLabel,
  isSummary,
}: IFileUploadTableRowProps) {
  const { langAsString } = useLanguage();
  const component = useExternalItem(baseComponentId);
  const hasTag = component?.type === 'FileUploadWithTag';
  const pdfModeActive = usePdfModeActive();
  const readableSize = getSizeWithUnit(attachment.data.size, 2);

  const hasOverriddenTaskId = Boolean(useTaskOverrides()?.taskId);

  const uniqueId = isAttachmentUploaded(attachment) ? attachment.data.id : attachment.data.temporaryId;

  const getStatusFromScanResult = () => {
    if (!attachment.uploaded) {
      return langAsString('general.loading');
    }

    const scanResult = attachment.data.fileScanResult;

    switch (scanResult) {
      case FileScanResults.Pending:
        return langAsString('form_filler.file_uploader_status_scanning');
      case FileScanResults.Infected:
        return langAsString('form_filler.file_uploader_status_infected');
      case FileScanResults.Clean:
      case FileScanResults.NotApplicable:
      default:
        return langAsString('form_filler.file_uploader_list_status_done');
    }
  };

  const status = getStatusFromScanResult();

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
      style={hasOverriddenTaskId ? { padding: '8px 0' } : {}}
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
          uploaded={attachment.uploaded}
          scanResult={attachment.uploaded ? attachment.data.fileScanResult : undefined}
        />
      )}

      {!isSummary && (
        <ButtonCellContent
          baseComponentId={baseComponentId}
          attachment={attachment}
          deleting={attachment.deleting}
          mobileView={mobileView}
        />
      )}
      {isSummary && !pdfModeActive && (
        <td>
          <EditButton
            className={classes.marginLeftAuto}
            targetBaseComponentId={baseComponentId}
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
                color: AltinnPalette.grey,
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
                      <Lang id='form_filler.file_uploader_list_status_done' />
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

const StatusCellContent = ({
  uploaded,
  status,
  scanResult,
}: {
  uploaded: boolean;
  status: string;
  scanResult?: string;
}) => {
  const getStatusElement = () => {
    if (!uploaded) {
      return (
        <AltinnLoader
          id='loader-upload'
          className={classes.altinnLoader}
          srContent={status}
        />
      );
    }

    const getTestId = () => {
      switch (scanResult) {
        case FileScanResults.Infected:
          return 'status-infected';
        case FileScanResults.Pending:
          return 'status-scanning';
        default:
          return 'status-success';
      }
    };

    const getClassName = () => {
      switch (scanResult) {
        case FileScanResults.Infected:
          return classes.statusInfected;
        case FileScanResults.Pending:
          return classes.statusScanning;
        default:
          return '';
      }
    };

    return (
      <div
        data-testid={getTestId()}
        className={getClassName()}
      >
        {status}
      </div>
    );
  };

  return <td>{getStatusElement()}</td>;
};

interface IButtonCellContentProps {
  deleting: boolean;
  baseComponentId: string;
  mobileView: boolean;
  attachment: IAttachment;
}

const ButtonCellContent = ({ deleting, baseComponentId, mobileView, attachment }: IButtonCellContentProps) => {
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
        baseComponentId={baseComponentId}
        mobileView={mobileView}
        attachment={attachment}
        editWindowIsOpen={false}
      />
    </td>
  );
};

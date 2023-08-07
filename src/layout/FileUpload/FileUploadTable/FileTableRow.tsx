import React from 'react';

import { CheckmarkCircleFillIcon } from '@navikt/aksel-icons';

import { AltinnLoader } from 'src/components/AltinnLoader';
import { useLanguage } from 'src/hooks/useLanguage';
import { AttachmentFileName } from 'src/layout/FileUpload/FileUploadTable/AttachmentFileName';
import { FileTableButtons } from 'src/layout/FileUpload/FileUploadTable/FileTableButtons';
import classes from 'src/layout/FileUpload/FileUploadTable/FileTableRow.module.css';
import { AltinnAppTheme } from 'src/theme/altinnAppTheme';
import type { IAttachment } from 'src/features/attachments';
import type { LayoutNodeFromType } from 'src/utils/layout/hierarchy.types';

class IFileUploadTableRowProps {
  attachment: IAttachment;
  mobileView: boolean;
  index: number;
  node: LayoutNodeFromType<'FileUpload' | 'FileUploadWithTag'>;
  tagLabel: string | undefined;
  editIndex: number;
  setEditIndex: (index: number) => void;
}

export const bytesInOneMB = 1048576;

export function FileTableRow({
  node,
  attachment,
  mobileView,
  index,
  tagLabel,
  editIndex,
  setEditIndex,
}: IFileUploadTableRowProps) {
  const { langAsString } = useLanguage();
  const hasTag = node.item.type === 'FileUploadWithTag';

  const readableSize = `${(attachment.size / bytesInOneMB).toFixed(2)} ${langAsString('form_filler.file_uploader_mb')}`;

  return (
    <tr
      key={attachment.id}
      className={classes.blueUnderlineDotted}
      id={`altinn-file-list-row-${attachment.id}`}
      tabIndex={0}
    >
      <NameCell
        attachment={attachment}
        mobileView={mobileView}
        readableSize={readableSize}
        hasTag={hasTag}
      />
      {hasTag && (
        <FileTypeCell
          tagLabel={tagLabel}
          index={index}
        />
      )}
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
        index={index}
        mobileView={mobileView}
        editIndex={editIndex}
        setEditIndex={setEditIndex}
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
  attachment: Pick<IAttachment, 'name' | 'size' | 'id' | 'uploaded'>;
  readableSize: string;
  hasTag: boolean;
}) => {
  const { langAsString } = useLanguage();
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
                  id={`attachment-loader-upload-${attachment.id}`}
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

const FileTypeCell = ({ index, tagLabel }) => {
  const { langAsString } = useLanguage();
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

const ButtonCellContent = ({ deleting, node, index, mobileView, editIndex, setEditIndex, attachment }) => {
  const { langAsString } = useLanguage();
  return (
    <td>
      {deleting ? (
        <AltinnLoader
          id='loader-delete'
          className={classes.deleteLoader}
          srContent={langAsString('general.loading')}
        />
      ) : (
        <FileTableButtons
          node={node}
          index={index}
          mobileView={mobileView}
          editIndex={editIndex}
          setEditIndex={setEditIndex}
          attachment={attachment}
          editWindowIsOpen={false}
        />
      )}
    </td>
  );
};

import React, { useState } from 'react';

import { Button } from '@digdir/design-system-react';
import { CheckmarkCircleFillIcon, TrashIcon } from '@navikt/aksel-icons';

import { AltinnLoader } from 'src/components/AltinnLoader';
import { DeleteWarningPopover } from 'src/components/molecules/DeleteWarningPopover';
import { AttachmentActions } from 'src/features/attachments/attachmentSlice';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import { useLanguage } from 'src/hooks/useLanguage';
import classes from 'src/layout/FileUpload/FileUploadTableRow.module.css';
import { AttachmentFileName } from 'src/layout/FileUpload/shared/AttachmentFileName';
import { AltinnAppTheme } from 'src/theme/altinnAppTheme';
import type { IAttachment } from 'src/features/attachments';
import type { IDataModelBindings } from 'src/layout/layout';

class IFileUploadTableRowProps {
  id: string;
  attachment: IAttachment;
  mobileView: boolean;
  index: number;
  alertOnDelete?: boolean;
  baseComponentId?: string;
  dataModelBindings?: IDataModelBindings;
}

export const bytesInOneMB = 1048576;

export function FileUploadTableRow({
  id,
  attachment,
  mobileView,
  index,
  alertOnDelete,
  baseComponentId,
  dataModelBindings,
}: IFileUploadTableRowProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const dispatch = useAppDispatch();

  const handleDeleteClick = () => {
    alertOnDelete ? setPopoverOpen(!popoverOpen) : handleDeleteFile();
  };

  const handlePopoverDeleteClick = () => {
    setPopoverOpen(false);
    handleDeleteFile();
  };

  const handleDeleteFile = () => {
    dispatch(
      AttachmentActions.deleteAttachment({
        attachment,
        attachmentType: baseComponentId ?? id,
        componentId: id,
        dataModelBindings,
      }),
    );
  };

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
      />
      <td>
        <StatusCellContent
          uploaded={attachment.uploaded}
          mobileView={mobileView}
        />
      </td>
      <td>
        <DeleteCellContent
          deleting={attachment.deleting}
          handleDeleteClick={handleDeleteClick}
          handlePopoverDeleteClick={handlePopoverDeleteClick}
          index={index}
          alertOnDelete={alertOnDelete}
          mobileView={mobileView}
          setPopoverOpen={setPopoverOpen}
          popoverOpen={popoverOpen}
        />
      </td>
    </tr>
  );
}

const NameCell = ({
  mobileView,
  attachment,
}: {
  mobileView: boolean;
  attachment: Pick<IAttachment, 'name' | 'size' | 'id' | 'uploaded'>;
}) => {
  const { langAsString } = useLanguage();
  const readableSize = `${(attachment.size / bytesInOneMB).toFixed(2)} ${langAsString('form_filler.file_uploader_mb')}`;

  return (
    <>
      <td>
        <AttachmentFileName
          attachment={attachment}
          mobileView={mobileView}
        />
        {mobileView ? (
          <div
            style={{
              color: AltinnAppTheme.altinnPalette.primary.grey,
            }}
          >
            {readableSize}
          </div>
        ) : null}
      </td>
      {!mobileView ? <td>{readableSize}</td> : null}
    </>
  );
};

const StatusCellContent = ({ uploaded, mobileView }) => {
  const { langAsString } = useLanguage();
  const status = uploaded
    ? langAsString('form_filler.file_uploader_list_status_done')
    : langAsString('general.loading');

  return uploaded ? (
    <div className={classes.fileStatus}>
      {mobileView ? null : status}
      <CheckmarkCircleFillIcon
        data-testid='checkmark-success'
        style={mobileView ? { margin: 'auto' } : {}}
        aria-hidden={!mobileView}
        aria-label={status}
        role='img'
      />
    </div>
  ) : (
    <AltinnLoader
      id='loader-upload'
      style={{
        marginBottom: '1rem',
        marginRight: '0.8125rem',
      }}
      srContent={status}
    />
  );
};

const DeleteCellContent = ({
  deleting,
  handleDeleteClick,
  handlePopoverDeleteClick,
  index,
  alertOnDelete,
  mobileView,
  setPopoverOpen,
  popoverOpen,
}: {
  deleting: boolean;
  handleDeleteClick: () => void;
  handlePopoverDeleteClick: () => void;
  index: number;
  alertOnDelete?: boolean;
  mobileView: boolean;
  setPopoverOpen: (open: boolean) => void;
  popoverOpen: boolean;
}) => {
  const { lang, langAsString } = useLanguage();
  return (
    <>
      {deleting ? (
        <AltinnLoader
          id='loader-delete'
          className={classes.deleteLoader}
          srContent={langAsString('general.loading')}
        />
      ) : (
        (() => {
          const deleteButton = (
            <Button
              className={classes.deleteButton}
              size='small'
              variant='quiet'
              color='danger'
              onClick={() => handleDeleteClick()}
              icon={<TrashIcon aria-hidden={true} />}
              iconPlacement='right'
              data-testid={`attachment-delete-${index}`}
              aria-label={langAsString('general.delete')}
            >
              {!mobileView && lang('form_filler.file_uploader_list_delete')}
            </Button>
          );
          if (alertOnDelete) {
            return (
              <DeleteWarningPopover
                trigger={deleteButton}
                placement='left'
                onPopoverDeleteClick={() => handlePopoverDeleteClick()}
                onCancelClick={() => setPopoverOpen(false)}
                deleteButtonText={langAsString('form_filler.file_uploader_delete_button_confirm')}
                messageText={langAsString('form_filler.file_uploader_delete_warning')}
                open={popoverOpen}
                setOpen={setPopoverOpen}
              />
            );
          } else {
            return deleteButton;
          }
        })()
      )}
    </>
  );
};

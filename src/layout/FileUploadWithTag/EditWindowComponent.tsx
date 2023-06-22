import React, { useState } from 'react';

import { Button } from '@digdir/design-system-react';
import { Grid } from '@material-ui/core';
import { CheckmarkCircleFillIcon, TrashIcon } from '@navikt/aksel-icons';
import classNames from 'classnames';

import { AltinnLoader } from 'src/components/AltinnLoader';
import { DeleteWarningPopover } from 'src/components/molecules/DeleteWarningPopover';
import { AttachmentActions } from 'src/features/attachments/attachmentSlice';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import { useLanguage } from 'src/hooks/useLanguage';
import { AttachmentFileName } from 'src/layout/FileUpload/shared/AttachmentFileName';
import classes from 'src/layout/FileUploadWithTag/EditWindowComponent.module.css';
import { renderValidationMessages } from 'src/utils/render';
import type { IAttachment } from 'src/features/attachments';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IOption } from 'src/types';

export interface EditWindowProps {
  node: PropsFromGenericComponent<'FileUploadWithTag'>['node'];
  attachment: IAttachment;
  mobileView: boolean;
  options?: IOption[];
  onSave: (attachment: IAttachment) => void;
  onDropdownDataChange: (id: string, value: string) => void;
  setEditIndex: (index: number) => void;
  attachmentValidations: {
    id: string;
    message: string;
  }[];
}

export function EditWindowComponent({
  attachment,
  attachmentValidations,
  mobileView,
  node,
  onDropdownDataChange,
  onSave,
  options,
  setEditIndex,
}: EditWindowProps): JSX.Element {
  const dispatch = useAppDispatch();
  const { id, baseComponentId, dataModelBindings, readOnly, textResourceBindings, alertOnDelete } = node.item;
  const { lang, langAsString } = useLanguage();
  const [popoverOpen, setPopoverOpen] = useState(false);

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
        componentId: id,
        attachmentType: baseComponentId || id,
        dataModelBindings,
      }),
    );
    setEditIndex(-1);
  };

  const saveIsDisabled = attachment.updating === true || attachment.uploaded === false || readOnly;

  return (
    <div
      id={`attachment-edit-window-${attachment.id}`}
      className={classes.editContainer}
    >
      <Grid
        justifyContent='space-between'
        container={true}
        spacing={0}
        direction='row'
        style={{ flexWrap: 'nowrap' }}
      >
        <Grid
          className={classes.textContainer}
          style={{ flexShrink: 1 }}
        >
          <AttachmentFileName
            attachment={attachment}
            mobileView={mobileView}
          />
        </Grid>
        <Grid
          className={classes.textContainer}
          style={{ flexShrink: 0 }}
        >
          <div className={classes.iconButtonWrapper}>
            {attachment.uploaded && (
              <div style={{ marginLeft: '0.9375rem', marginRight: '0.9375rem' }}>
                {!mobileView ? lang('form_filler.file_uploader_list_status_done') : undefined}
                <CheckmarkCircleFillIcon
                  role='img'
                  aria-hidden={!mobileView}
                  aria-label={langAsString('form_filler.file_uploader_list_status_done')}
                  className={classes.checkMark}
                  data-testid='checkmark-success'
                />
              </div>
            )}
            {!attachment.uploaded && (
              <AltinnLoader
                id={`attachment-loader-upload-${attachment.id}`}
                style={{
                  width: '80px',
                }}
                srContent={langAsString('general.loading')}
              />
            )}
            <div>
              <DeleteButton
                alertOnDelete={alertOnDelete}
                mobileView={mobileView}
                handleDeleteClick={handleDeleteClick}
                handlePopoverDeleteClick={handlePopoverDeleteClick}
                popoverOpen={popoverOpen}
                setPopoverOpen={setPopoverOpen}
              />
            </div>
          </div>
        </Grid>
      </Grid>
      <Grid>
        {textResourceBindings?.tagTitle && (
          <label
            className={classes.label}
            htmlFor={`attachment-tag-dropdown-${attachment.id}`}
          >
            {lang(textResourceBindings?.tagTitle)}
          </label>
        )}
        <Grid
          container={true}
          spacing={1}
        >
          <Grid
            item={true}
            xs
          >
            <select
              id={`attachment-tag-dropdown-${attachment.id}`}
              tabIndex={0}
              defaultValue={attachment.tags && attachment.tags[0]}
              disabled={saveIsDisabled}
              className={classNames(classes.select, 'custom-select a-custom-select', {
                'validation-error': attachmentValidations.filter((i) => i.id === attachment.id).length > 0,
                'disabled !important': attachment.updating || readOnly,
              })}
              onChange={(e) => onDropdownDataChange(attachment.id, e.target.value)}
              onBlur={(e) => onDropdownDataChange(attachment.id, e.target.value)}
            >
              <option style={{ display: 'none' }} />
              {options?.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {lang(option.label)}
                </option>
              ))}
            </select>
          </Grid>
          <Grid
            item={true}
            xs='auto'
          >
            {attachment.updating ? (
              <AltinnLoader
                id={`attachment-loader-update-${attachment.id}`}
                srContent={langAsString('general.loading')}
                style={{
                  height: '30px',
                  padding: '7px 34px 5px 28px',
                }}
              />
            ) : (
              <Button
                onClick={() => onSave(attachment)}
                id={`attachment-save-tag-button-${attachment.id}`}
                disabled={saveIsDisabled}
              >
                {lang('general.save')}
              </Button>
            )}
          </Grid>
        </Grid>
      </Grid>
      {attachmentValidations.filter((i) => i.id === attachment.id).length > 0 ? (
        <div
          style={{
            whiteSpace: 'pre-wrap',
          }}
        >
          {renderValidationMessages(
            attachmentValidations.filter((i) => i.id === attachment.id).map((e) => e.message),
            `attachment-error-${attachment.id}`,
            'error',
          )}
        </div>
      ) : undefined}
    </div>
  );
}

const DeleteButton = ({
  alertOnDelete,
  mobileView,
  handleDeleteClick,
  handlePopoverDeleteClick,
  popoverOpen,
  setPopoverOpen,
}: {
  alertOnDelete?: boolean;
  mobileView: boolean;
  handleDeleteClick: () => void;
  handlePopoverDeleteClick: () => void;
  popoverOpen: boolean;
  setPopoverOpen: (open: boolean) => void;
}) => {
  const { lang, langAsString } = useLanguage();
  const deleteButton = (
    <Button
      onClick={() => handleDeleteClick()}
      variant='quiet'
      color='danger'
      icon={<TrashIcon aria-hidden={true} />}
      iconPlacement='right'
      data-testid='attachment-delete'
    >
      {!mobileView && lang('general.delete')}
    </Button>
  );
  if (alertOnDelete) {
    return (
      <DeleteWarningPopover
        trigger={deleteButton}
        onPopoverDeleteClick={() => handlePopoverDeleteClick()}
        placement='left'
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
};

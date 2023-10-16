import React from 'react';

import { Button } from '@digdir/design-system-react';
import { PencilIcon, TrashIcon } from '@navikt/aksel-icons';

import { ConditionalWrapper } from 'src/components/ConditionalWrapper';
import { DeleteWarningPopover } from 'src/components/molecules/DeleteWarningPopover';
import { AttachmentActions } from 'src/features/attachments/attachmentSlice';
import { useAlertOnChange } from 'src/hooks/useAlertOnChange';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import { useLanguage } from 'src/hooks/useLanguage';
import classes from 'src/layout/FileUpload/FileUploadTable/FileTableRow.module.css';
import { useFileTableRowContext } from 'src/layout/FileUpload/FileUploadTable/FileTableRowContext';
import type { IAttachment } from 'src/features/attachments';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

interface IFileTableButtonsProps {
  node: LayoutNode<'FileUpload' | 'FileUploadWithTag'>;
  attachment: IAttachment;
  mobileView: boolean;
  editWindowIsOpen: boolean;
}

export function FileTableButtons({ node, attachment, mobileView, editWindowIsOpen }: IFileTableButtonsProps) {
  const { id, baseComponentId, dataModelBindings, alertOnDelete, type } = node.item;
  const hasTag = type === 'FileUploadWithTag';
  const showEditButton = hasTag && !editWindowIsOpen;
  const { lang, langAsString } = useLanguage();
  const dispatch = useAppDispatch();
  const { index, setEditIndex, editIndex } = useFileTableRowContext();

  // Edit button
  const handleEdit = (index: number) => {
    if (editIndex === -1 || editIndex !== index) {
      setEditIndex(index);
    } else {
      setEditIndex(-1);
    }
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
    editWindowIsOpen && setEditIndex(-1);
  };

  const {
    alertOpen,
    setAlertOpen,
    handleChange: handleDelete,
    confirmChange,
    cancelChange,
  } = useAlertOnChange(Boolean(alertOnDelete), handleDeleteFile);

  return (
    <ConditionalWrapper
      condition={Boolean(alertOnDelete)}
      wrapper={(children) => (
        <DeleteWarningPopover
          placement='left'
          onPopoverDeleteClick={confirmChange}
          onCancelClick={cancelChange}
          deleteButtonText={langAsString('form_filler.file_uploader_delete_button_confirm')}
          messageText={langAsString('form_filler.file_uploader_delete_warning')}
          open={alertOpen}
          setOpen={setAlertOpen}
        >
          {children}
        </DeleteWarningPopover>
      )}
    >
      <Button
        className={classes.button}
        size='small'
        variant='quiet'
        color={showEditButton ? 'second' : 'danger'}
        onClick={() => (showEditButton ? handleEdit(index) : handleDelete())}
        icon={showEditButton ? <PencilIcon aria-hidden={true} /> : <TrashIcon aria-hidden={true} />}
        iconPlacement='right'
        data-testid={`attachment-delete-${index}`}
        aria-label={langAsString(showEditButton ? 'general.edit_alt' : 'general.delete')}
      >
        {!mobileView && lang(showEditButton ? 'general.edit_alt' : 'form_filler.file_uploader_list_delete')}
      </Button>
    </ConditionalWrapper>
  );
}

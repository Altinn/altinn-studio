import React from 'react';

import { PencilIcon, TrashIcon } from '@navikt/aksel-icons';

import { Button } from 'src/app-components/Button/Button';
import { ConditionalWrapper } from 'src/app-components/ConditionalWrapper/ConditionalWrapper';
import { DeleteWarningPopover } from 'src/features/alertOnChange/DeleteWarningPopover';
import { useAlertOnChange } from 'src/features/alertOnChange/useAlertOnChange';
import { isAttachmentUploaded } from 'src/features/attachments';
import { useAttachmentsRemover } from 'src/features/attachments/hooks';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import classes from 'src/layout/FileUpload/FileUploadTable/FileTableRow.module.css';
import { useFileTableRow } from 'src/layout/FileUpload/FileUploadTable/FileTableRowContext';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { IAttachment } from 'src/features/attachments';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

interface IFileTableButtonsProps {
  node: LayoutNode<'FileUpload' | 'FileUploadWithTag'>;
  attachment: IAttachment;
  mobileView: boolean;
  editWindowIsOpen: boolean;
}

export function FileTableButtons({ node, attachment, mobileView, editWindowIsOpen }: IFileTableButtonsProps) {
  const { alertOnDelete, type, dataModelBindings, readOnly } = useItemWhenType(node.baseId, node.type);
  const hasTag = type === 'FileUploadWithTag';
  const showEditButton = hasTag && !editWindowIsOpen && !readOnly;
  const { langAsString } = useLanguage();
  const { index, setEditIndex, editIndex } = useFileTableRow();
  const removeAttachment = useAttachmentsRemover();

  // Edit button
  const handleEdit = (index: number) => {
    if (editIndex === -1 || editIndex !== index) {
      setEditIndex(index);
    } else {
      setEditIndex(-1);
    }
  };

  const handleDeleteFile = async () => {
    if (!isAttachmentUploaded(attachment)) {
      return;
    }

    await removeAttachment({ attachment, nodeId: node.id, dataModelBindings });
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
        variant='tertiary'
        color={showEditButton ? 'second' : 'danger'}
        onClick={() => (showEditButton ? handleEdit(index) : handleDelete())}
        aria-label={langAsString(showEditButton ? 'general.edit_alt' : 'form_filler.file_uploader_list_delete')}
        icon={mobileView}
      >
        {!mobileView && <Lang id={showEditButton ? 'general.edit_alt' : 'form_filler.file_uploader_list_delete'} />}
        {showEditButton ? (
          <PencilIcon
            fontSize='1rem'
            aria-hidden={true}
          />
        ) : (
          <TrashIcon
            fontSize='1rem'
            aria-hidden={true}
          />
        )}
      </Button>
    </ConditionalWrapper>
  );
}

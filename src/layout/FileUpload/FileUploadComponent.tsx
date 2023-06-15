import React from 'react';
import type { FileRejection } from 'react-dropzone';

import { Button } from '@digdir/design-system-react';
import { CheckmarkCircleFillIcon, TrashIcon } from '@navikt/aksel-icons';
import { v4 as uuidv4 } from 'uuid';

import { AltinnLoader } from 'src/components/AltinnLoader';
import { AttachmentActions } from 'src/features/attachments/attachmentSlice';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { useIsMobileOrTablet } from 'src/hooks/useIsMobile';
import { useLanguage } from 'src/hooks/useLanguage';
import classes from 'src/layout/FileUpload/FileUploadComponent.module.css';
import { AttachmentFileName } from 'src/layout/FileUpload/shared/AttachmentFileName';
import { DropzoneComponent } from 'src/layout/FileUpload/shared/DropzoneComponent';
import { handleRejectedFiles } from 'src/layout/FileUpload/shared/handleRejectedFiles';
import { AttachmentsCounter } from 'src/layout/FileUpload/shared/render';
import { AltinnAppTheme } from 'src/theme/altinnAppTheme';
import { renderValidationMessagesForComponent } from 'src/utils/render';
import type { IAttachment } from 'src/features/attachments';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IComponentValidations } from 'src/types';

export type IFileUploadProps = PropsFromGenericComponent<'FileUpload'>;

export const bytesInOneMB = 1048576;
export const emptyArray = [];

export function FileUploadComponent({ node, componentValidations, language }: IFileUploadProps) {
  const {
    id,
    baseComponentId,
    readOnly,
    maxNumberOfAttachments,
    maxFileSizeInMB,
    minNumberOfAttachments,
    validFileEndings,
    displayMode,
    hasCustomFileEndings,
    textResourceBindings,
    dataModelBindings,
  } = node.item;
  const dispatch = useAppDispatch();
  const [validations, setValidations] = React.useState<string[]>([]);
  const [showFileUpload, setShowFileUpload] = React.useState(false);
  const mobileView = useIsMobileOrTablet();
  const attachments = useAppSelector((state) => state.attachments.attachments[id] || emptyArray);
  const { lang, langAsString } = useLanguage();

  const getComponentValidations = (): IComponentValidations => {
    const validationMessages = {
      simpleBinding: {
        errors: [...(componentValidations?.simpleBinding?.errors ?? [])],
        warnings: [...(componentValidations?.simpleBinding?.warnings ?? [])],
        fixed: [...(componentValidations?.simpleBinding?.fixed ?? [])],
      },
    };

    validationMessages.simpleBinding.errors.push(...validations);
    return validationMessages;
  };

  const handleDrop = (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    const fileType = baseComponentId || id;
    const totalAttachments = acceptedFiles.length + rejectedFiles.length + attachments.length;

    if (totalAttachments > maxNumberOfAttachments) {
      // if the user adds more attachments than max, all should be ignored
      setValidations([
        `${langAsString(
          'form_filler.file_uploader_validation_error_exceeds_max_files_1',
        )} ${maxNumberOfAttachments} ${langAsString('form_filler.file_uploader_validation_error_exceeds_max_files_2')}`,
      ]);
    } else {
      // we should upload all files, if any rejected files we should display an error
      acceptedFiles.forEach((file: File, index) => {
        dispatch(
          AttachmentActions.uploadAttachment({
            file,
            attachmentType: fileType,
            tmpAttachmentId: uuidv4(),
            componentId: id,
            dataModelBindings,
            index: attachments.length + index,
          }),
        );
      });

      if (acceptedFiles.length > 0) {
        setShowFileUpload(displayMode === 'simple' ? false : attachments.length < maxNumberOfAttachments);
      }

      const rejections = handleRejectedFiles({
        language,
        rejectedFiles,
        maxFileSizeInMB,
      });
      setValidations(rejections);
    }
  };

  const handleDeleteFile = (index: number) => {
    const attachmentToDelete = attachments[index];
    dispatch(
      AttachmentActions.deleteAttachment({
        attachment: attachmentToDelete,
        attachmentType: baseComponentId || id,
        componentId: id,
        dataModelBindings,
      }),
    );
  };
  const NonMobileColumnHeader = () =>
    !mobileView ? <th scope='col'>{lang('form_filler.file_uploader_list_header_file_size')}</th> : null;

  const StatusCellContent = ({ attachment }: { attachment: { uploaded: boolean } }) => {
    const { uploaded } = attachment;
    const status = attachment.uploaded
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
  const DeleteCellContent = ({ attachment, index }: { attachment: { deleting: boolean }; index: number }) => (
    <>
      {attachment.deleting ? (
        <AltinnLoader
          id='loader-delete'
          className={classes.deleteLoader}
          srContent={langAsString('general.loading')}
        />
      ) : (
        <Button
          className={classes.deleteButton}
          size='small'
          variant='quiet'
          color='danger'
          onClick={() => handleDeleteFile(index)}
          icon={<TrashIcon aria-hidden={true} />}
          iconPlacement='right'
          data-testid={`attachment-delete-${index}`}
          aria-label={langAsString('general.delete')}
        >
          {!mobileView && lang('form_filler.file_uploader_list_delete')}
        </Button>
      )}
    </>
  );

  const FileList = (): JSX.Element | null => {
    if (!attachments?.length) {
      return null;
    }
    return (
      <div
        id={`altinn-file-list${id}`}
        data-testid={id}
      >
        <table
          className={classes.fileUploadTable}
          data-testid='file-upload-table'
        >
          <thead>
            <tr
              className={classes.blueUnderline}
              id='altinn-file-list-row-header'
            >
              <th
                scope='col'
                style={!mobileView ? { width: '30%' } : {}}
              >
                {lang('form_filler.file_uploader_list_header_name')}
              </th>
              <NonMobileColumnHeader />
              <th
                scope='col'
                style={mobileView ? { textAlign: 'center' } : {}}
              >
                {lang('form_filler.file_uploader_list_header_status')}
              </th>
              <th
                scope='col'
                style={!mobileView ? { width: '30%' } : {}}
              >
                <p className='sr-only'>{lang('form_filler.file_uploader_list_header_delete_sr')}</p>
              </th>
            </tr>
          </thead>
          <tbody>
            {attachments.map((attachment, index: number) => (
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
                  <StatusCellContent attachment={attachment} />
                </td>
                <td>
                  <DeleteCellContent
                    attachment={attachment}
                    index={index}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const shouldShowFileUpload = (): boolean => {
    if (attachments.length >= maxNumberOfAttachments) {
      return false;
    }
    return displayMode !== 'simple' || attachments.length === 0 || showFileUpload === true;
  };

  const renderAddMoreAttachmentsButton = (): JSX.Element | null => {
    if (
      displayMode === 'simple' &&
      !showFileUpload &&
      attachments.length < maxNumberOfAttachments &&
      attachments.length > 0
    ) {
      return (
        <button
          className={`${classes.fileUploadButton} ${classes.blueUnderline}`}
          onClick={() => setShowFileUpload(true)}
          type='button'
        >
          {lang('form_filler.file_uploader_add_attachment')}
        </button>
      );
    }
    return null;
  };

  const validationMessages = getComponentValidations();
  const hasValidationMessages =
    validationMessages.simpleBinding?.errors && validationMessages.simpleBinding.errors.length > 0;

  return (
    <div
      id={`altinn-fileuploader-${id}`}
      style={{ padding: '0px' }}
    >
      {shouldShowFileUpload() && (
        <DropzoneComponent
          id={id}
          isMobile={mobileView}
          maxFileSizeInMB={maxFileSizeInMB}
          readOnly={!!readOnly}
          onClick={(e) => e.preventDefault()}
          onDrop={handleDrop}
          hasValidationMessages={!!hasValidationMessages}
          hasCustomFileEndings={hasCustomFileEndings}
          validFileEndings={validFileEndings}
          textResourceBindings={textResourceBindings}
        />
      )}

      {shouldShowFileUpload() &&
        AttachmentsCounter({
          language,
          currentNumberOfAttachments: attachments.length,
          minNumberOfAttachments,
          maxNumberOfAttachments,
        })}

      {validationMessages.simpleBinding?.errors &&
        validationMessages.simpleBinding.errors.length > 0 &&
        showFileUpload &&
        renderValidationMessagesForComponent(validationMessages.simpleBinding, id)}
      <FileList />
      {!shouldShowFileUpload() &&
        AttachmentsCounter({
          language,
          currentNumberOfAttachments: attachments.length,
          minNumberOfAttachments,
          maxNumberOfAttachments,
        })}

      {validationMessages.simpleBinding?.errors &&
        validationMessages.simpleBinding.errors.length > 0 &&
        !showFileUpload &&
        renderValidationMessagesForComponent(validationMessages.simpleBinding, id)}

      {renderAddMoreAttachmentsButton()}
    </div>
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

import * as React from 'react';
import { isMobile } from 'react-device-detect';
import type { FileRejection } from 'react-dropzone';

import useMediaQuery from '@material-ui/core/useMediaQuery';
import { v4 as uuidv4 } from 'uuid';

import { useAppDispatch, useAppSelector } from 'src/common/hooks';
import { AltinnLoader } from 'src/components/shared';
import { DropzoneComponent, handleRejectedFiles } from 'src/layout/FileUpload/shared';
import { AttachmentsCounter, FileName } from 'src/layout/FileUpload/shared/render';
import { AttachmentActions } from 'src/shared/resources/attachments/attachmentSlice';
import { AltinnAppTheme } from 'src/theme';
import { renderValidationMessagesForComponent } from 'src/utils/render';
import { getLanguageFromKey } from 'src/utils/sharedUtils';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IAttachment } from 'src/shared/resources/attachments';
import type { IComponentValidations } from 'src/types';

import 'src/layout/FileUpload/FileUploadComponent.css';

export type IFileUploadProps = PropsFromGenericComponent<'FileUpload'>;

export const bytesInOneMB = 1048576;
export const emptyArray = [];

export function FileUploadComponent({
  id,
  baseComponentId,
  componentValidations,
  readOnly,
  maxNumberOfAttachments,
  maxFileSizeInMB,
  minNumberOfAttachments,
  validFileEndings,
  language,
  displayMode,
  hasCustomFileEndings,
  textResourceBindings,
  dataModelBindings,
}: IFileUploadProps) {
  const dispatch = useAppDispatch();
  const [validations, setValidations] = React.useState<string[]>([]);
  const [showFileUpload, setShowFileUpload] = React.useState(false);
  const mobileView = useMediaQuery('(max-width:992px)'); // breakpoint on altinn-modal
  const attachments = useAppSelector((state) => state.attachments.attachments[id] || emptyArray);

  const getComponentValidations = (): IComponentValidations => {
    const validationMessages = {
      simpleBinding: {
        errors: [...(componentValidations?.simpleBinding?.errors || [])],
        warnings: [...(componentValidations?.simpleBinding?.warnings || [])],
        fixed: [...(componentValidations?.simpleBinding?.fixed || [])],
      },
    };
    if (!validations || validations.length === 0) {
      return validationMessages;
    }
    validations.forEach((message) => {
      validationMessages.simpleBinding.errors.push(message);
    });
    return validationMessages;
  };

  const handleDrop = (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    const newFiles: IAttachment[] = [];
    const fileType = baseComponentId || id;
    const totalAttachments = acceptedFiles.length + rejectedFiles.length + attachments.length;

    if (totalAttachments > maxNumberOfAttachments) {
      // if the user adds more attachments than max, all should be ignored
      setValidations([
        `${getLanguageFromKey(
          'form_filler.file_uploader_validation_error_exceeds_max_files_1',
          language,
        )} ${maxNumberOfAttachments} ${getLanguageFromKey(
          'form_filler.file_uploader_validation_error_exceeds_max_files_2',
          language,
        )}`,
      ]);
    } else {
      // we should upload all files, if any rejected files we should display an error
      acceptedFiles.forEach((file: File, index) => {
        if (attachments.length + newFiles.length < maxNumberOfAttachments) {
          const tmpId: string = uuidv4();
          newFiles.push({
            name: file.name,
            size: file.size,
            uploaded: false,
            id: tmpId,
            tags: undefined,
            deleting: false,
            updating: false,
          });
          dispatch(
            AttachmentActions.uploadAttachment({
              file,
              attachmentType: fileType,
              tmpAttachmentId: tmpId,
              componentId: id,
              dataModelBindings,
              index: attachments.length + index,
            }),
          );
        }
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

  const handleDeleteKeypress = (index: number, event: any) => {
    if (event.key === 'Enter') {
      handleDeleteFile(index);
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
  const NonMobileColumnHeader = () => {
    return !mobileView ? (
      <th scope='col'>{getLanguageFromKey('form_filler.file_uploader_list_header_file_size', language)}</th>
    ) : null;
  };
  const NameCell = ({ attachment }: { attachment: { name?: string; size: number } }) => {
    const readableSize = `${(attachment.size / bytesInOneMB).toFixed(2)} ${getLanguageFromKey(
      'form_filler.file_uploader_mb',
      language,
    )}`;
    return (
      <>
        <td>
          <FileName>{attachment.name}</FileName>
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
  const StatusCellContent = ({ attachment }: { attachment: { uploaded: boolean } }) => {
    const { uploaded } = attachment;
    const status = attachment.uploaded
      ? getLanguageFromKey('form_filler.file_uploader_list_status_done', language)
      : getLanguageFromKey('general.loading', language);

    return uploaded ? (
      <div>
        {mobileView ? null : status}
        <i
          aria-hidden={!mobileView}
          aria-label={status}
          role='img'
          className='ai ai-check-circle'
          style={mobileView ? { marginLeft: '10px' } : {}}
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
  const DeleteCellContent = ({ attachment, index }: { attachment: { deleting: boolean }; index: number }) => {
    return (
      <div
        onClick={handleDeleteFile.bind(this, index)}
        onKeyPress={handleDeleteKeypress.bind(this, index)}
        tabIndex={0}
        role='button'
        data-testid={`attachment-delete-${index}`}
        aria-label={getLanguageFromKey('general.delete', language)}
      >
        {attachment.deleting ? (
          <AltinnLoader
            id='loader-delete'
            style={{
              marginBottom: '1rem',
              marginRight: '1.0rem',
            }}
            srContent={getLanguageFromKey('general.loading', language)}
          />
        ) : (
          <>
            {mobileView
              ? getLanguageFromKey('general.delete', language)
              : getLanguageFromKey('form_filler.file_uploader_list_delete', language)}
            <i className='ai ai-trash' />
          </>
        )}
      </div>
    );
  };
  const FileList = (): JSX.Element | null => {
    if (!attachments?.length) {
      return null;
    }
    return (
      <div
        id={`altinn-file-list${id}`}
        data-testid={id}
      >
        <table className='file-upload-table'>
          <thead>
            <tr
              className='blue-underline'
              id='altinn-file-list-row-header'
            >
              <th
                scope='col'
                style={mobileView ? { width: '65%' } : {}}
              >
                {getLanguageFromKey('form_filler.file_uploader_list_header_name', language)}
              </th>
              <NonMobileColumnHeader />
              <th scope='col'>{getLanguageFromKey('form_filler.file_uploader_list_header_status', language)}</th>
              <th scope='col'>
                <p className='sr-only'>
                  {getLanguageFromKey('form_filler.file_uploader_list_header_delete_sr', language)}
                </p>
              </th>
            </tr>
          </thead>
          <tbody>
            {attachments.map((attachment, index: number) => {
              return (
                <tr
                  key={attachment.id}
                  className='blue-underline-dotted'
                  id={`altinn-file-list-row-${attachment.id}`}
                  tabIndex={0}
                >
                  <NameCell attachment={attachment} />
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
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const updateShowFileUpload = () => {
    setShowFileUpload(true);
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
          className='file-upload-button blue-underline'
          onClick={updateShowFileUpload}
          type='button'
        >
          {getLanguageFromKey('form_filler.file_uploader_add_attachment', language)}
        </button>
      );
    }
    return null;
  };

  const handleClick = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
    event.preventDefault();
  };

  const validationMessages = getComponentValidations();
  const hasValidationMessages =
    validationMessages.simpleBinding?.errors && validationMessages.simpleBinding.errors.length > 0;

  return (
    <div
      className='container'
      id={`altinn-fileuploader-${id}`}
      style={{ padding: '0px' }}
    >
      {shouldShowFileUpload() && (
        <DropzoneComponent
          id={id}
          isMobile={isMobile}
          language={language}
          maxFileSizeInMB={maxFileSizeInMB}
          readOnly={!!readOnly}
          onClick={handleClick}
          onDrop={handleDrop}
          hasValidationMessages={!!hasValidationMessages}
          hasCustomFileEndings={hasCustomFileEndings}
          validFileEndings={validFileEndings}
          textResourceBindings={textResourceBindings}
        />
      )}

      {shouldShowFileUpload() &&
        AttachmentsCounter({
          language: language,
          currentNumberOfAttachments: attachments.length,
          minNumberOfAttachments: minNumberOfAttachments,
          maxNumberOfAttachments: maxNumberOfAttachments,
        })}

      {validationMessages.simpleBinding?.errors &&
        validationMessages.simpleBinding.errors.length > 0 &&
        showFileUpload &&
        renderValidationMessagesForComponent(validationMessages.simpleBinding, id)}
      <FileList />
      {!shouldShowFileUpload() &&
        AttachmentsCounter({
          language: language,
          currentNumberOfAttachments: attachments.length,
          minNumberOfAttachments: minNumberOfAttachments,
          maxNumberOfAttachments: maxNumberOfAttachments,
        })}

      {validationMessages.simpleBinding?.errors &&
        validationMessages.simpleBinding.errors.length > 0 &&
        !showFileUpload &&
        renderValidationMessagesForComponent(validationMessages.simpleBinding, id)}

      {renderAddMoreAttachmentsButton()}
    </div>
  );
}

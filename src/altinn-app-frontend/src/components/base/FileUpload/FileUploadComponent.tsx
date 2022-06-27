import * as React from 'react';
import { FileRejection } from 'react-dropzone';
import { AltinnAppTheme } from 'altinn-shared/theme';
import { getLanguageFromKey } from 'altinn-shared/utils';
import { AltinnLoader } from 'altinn-shared/components';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import { isMobile } from 'react-device-detect';
import { IAttachment } from 'src/shared/resources/attachments';
import AttachmentDispatcher from '../../../shared/resources/attachments/attachmentActions';
import './FileUploadComponent.css';
import { IComponentValidations } from 'src/types';
import { renderValidationMessagesForComponent } from 'src/utils/render';
import { v4 as uuidv4 } from 'uuid';
import { useAppSelector } from 'src/common/hooks';
import { AttachmentsCounter, FileName } from './shared/render';
import { DropzoneComponent } from './shared/DropzoneComponent';
import { IFileUploadGenericProps } from './shared/props';

export interface IFileUploadProps extends IFileUploadGenericProps {
  displayMode: string;
}

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
  const [validations, setValidations] = React.useState([]);
  const [showFileUpload, setShowFileUpload] = React.useState(false);
  const mobileView = useMediaQuery('(max-width:992px)'); // breakpoint on altinn-modal
  const attachments = useAppSelector(state => state.attachments.attachments[id] || emptyArray);

  const getComponentValidations = (): IComponentValidations => {
    const validationMessages = {
      simpleBinding: {
        errors: [...(componentValidations?.simpleBinding?.errors || [])],
        warnings: [
          ...(componentValidations?.simpleBinding?.warnings || []),
        ],
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
    const tmpValidations: string[] = [];
    const totalAttachments =
      acceptedFiles.length + rejectedFiles.length + attachments.length;

    if (totalAttachments > maxNumberOfAttachments) {
      // if the user adds more attachments than max, all should be ignored
      tmpValidations.push(
        `${getLanguageFromKey(
          'form_filler.file_uploader_validation_error_exceeds_max_files_1',
          language,
        )} ${maxNumberOfAttachments} ${getLanguageFromKey(
          'form_filler.file_uploader_validation_error_exceeds_max_files_2',
          language,
        )}`,
      );
    } else {
      // we should upload all files, if any rejected files we should display an error
      acceptedFiles.forEach((file: File, index) => {
        if (
          attachments.length + newFiles.length <
          maxNumberOfAttachments
        ) {
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
          AttachmentDispatcher.uploadAttachment(
            file,
            fileType,
            tmpId,
            id,
            dataModelBindings,
            attachments.length + index
          );
        }
      });

      if (acceptedFiles.length > 0) {
        setShowFileUpload(
          displayMode === 'simple'
            ? false
            : attachments.length < maxNumberOfAttachments,
        );
      }

      if (rejectedFiles.length > 0) {
        rejectedFiles.forEach((fileRejection) => {
          if (fileRejection.file.size > maxFileSizeInMB * bytesInOneMB) {
            tmpValidations.push(
              `${fileRejection.file.name} ${getLanguageFromKey(
                'form_filler.file_uploader_validation_error_file_size',
                language,
              )}`,
            );
          } else {
            tmpValidations.push(
              `${getLanguageFromKey(
                'form_filler.file_uploader_validation_error_general_1',
                language,
              )} ${fileRejection.file.name} ${getLanguageFromKey(
                'form_filler.file_uploader_validation_error_general_2',
                language,
              )}`,
            );
          }
        });
      }
    }
    setValidations(tmpValidations);
  };

  const handleDeleteKeypress = (index: number, event: any) => {
    if (event.key === 'Enter') {
      handleDeleteFile(index);
    }
  };

  const handleDeleteFile = (index: number) => {
    const attachmentToDelete = attachments[index];
    const fileType = baseComponentId || id;
    AttachmentDispatcher.deleteAttachment(
      attachmentToDelete,
      fileType,
      id,
      dataModelBindings,
    );
  };

  const renderFileList = (): JSX.Element => {
    if (!attachments || attachments.length === 0) {
      return null;
    }
    return (
      <div id={`altinn-file-list${id}`} data-testid={id}>
        <table className='file-upload-table'>
          <thead>
            <tr className='blue-underline' id='altinn-file-list-row-header'>
              <th scope='col' style={mobileView ? { width: '65%' } : null}>
                {getLanguageFromKey(
                  'form_filler.file_uploader_list_header_name',
                  language,
                )}
              </th>
              {!mobileView ? (
                <th scope='col'>
                  {getLanguageFromKey(
                    'form_filler.file_uploader_list_header_file_size',
                    language,
                  )}
                </th>
              ) : null}
              <th scope='col'>
                {getLanguageFromKey(
                  'form_filler.file_uploader_list_header_status',
                  language,
                )}
              </th>
              <th scope='col'>
                <p className='sr-only'>
                  {getLanguageFromKey(
                    'form_filler.file_uploader_list_header_delete_sr',
                    language,
                  )}
                </p>
              </th>
            </tr>
          </thead>
          <tbody>
            {attachments.map((attachment, index: number) => {
              const readableSize = `${(attachment.size / bytesInOneMB).toFixed(
                2,
              )} ${getLanguageFromKey(
                'form_filler.file_uploader_mb',
                language,
              )}`;

              const status = attachment.uploaded
                ? getLanguageFromKey(
                    'form_filler.file_uploader_list_status_done',
                    language,
                  )
                : getLanguageFromKey('general.loading', language);

              return (
                <tr
                  key={attachment.id}
                  className='blue-underline-dotted'
                  id={`altinn-file-list-row-${attachment.id}`}
                  tabIndex={0}
                >
                  <td>
                    {FileName(attachment.name)}
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
                  <td>
                    {attachment.uploaded ? (
                      <div>
                        {mobileView ? null : status}
                        <i
                          className='ai ai-check-circle'
                          aria-label={status}
                          style={mobileView ? { marginLeft: '10px' } : null}
                        />
                      </div>
                    ) : (
                      <AltinnLoader
                        id='loader-upload'
                        style={{
                          marginBottom: '1.6rem',
                          marginRight: '1.3rem',
                        }}
                        srContent={status}
                      />
                    )}
                  </td>
                  <td>
                    <div
                      onClick={handleDeleteFile.bind(this, index)}
                      id={`attachment-delete-${index}`}
                      onKeyPress={handleDeleteKeypress.bind(this, index)}
                      tabIndex={0}
                      role='button'
                    >
                      {attachment.deleting ? (
                        <AltinnLoader
                          id='loader-delete'
                          style={{
                            marginBottom: '1.6rem',
                            marginRight: '1.0rem',
                          }}
                          srContent={getLanguageFromKey(
                            'general.loading',
                            language,
                          )}
                        />
                      ) : (
                        <>
                          {mobileView
                            ? getLanguageFromKey('general.delete', language)
                            : getLanguageFromKey(
                                'form_filler.file_uploader_list_delete',
                                language,
                              )}
                          <i
                            className='ai ai-trash'
                            aria-label={getLanguageFromKey(
                              'general.delete',
                              language,
                            )}
                          />
                        </>
                      )}
                    </div>
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
    return (
      displayMode !== 'simple' ||
      attachments.length === 0 ||
      showFileUpload === true
    );
  };

  const renderAddMoreAttachmentsButton = (): JSX.Element => {
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
          {getLanguageFromKey(
            'form_filler.file_uploader_add_attachment',
            language,
          )}
        </button>
      );
    }
    return null;
  };

  const handleClick = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
    event.preventDefault();
  };

  const validationMessages = getComponentValidations();
  const hasValidationMessages: boolean =
    validationMessages.simpleBinding.errors.length > 0;
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
          readOnly={readOnly}
          onClick={handleClick}
          onDrop={handleDrop}
          hasValidationMessages={hasValidationMessages}
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
          maxNumberOfAttachments: maxNumberOfAttachments
        })
      }

      {validationMessages.simpleBinding.errors.length > 0 &&
        showFileUpload &&
        renderValidationMessagesForComponent(
          validationMessages.simpleBinding,
          id,
        )}

      {renderFileList()}

      {!shouldShowFileUpload() &&
        AttachmentsCounter({
          language: language,
          currentNumberOfAttachments: attachments.length,
          minNumberOfAttachments: minNumberOfAttachments,
          maxNumberOfAttachments: maxNumberOfAttachments
        })
      }

      {validationMessages.simpleBinding.errors.length > 0 &&
        !showFileUpload &&
        renderValidationMessagesForComponent(
          validationMessages.simpleBinding,
          id,
        )}

      {renderAddMoreAttachmentsButton()}
    </div>
  );
}

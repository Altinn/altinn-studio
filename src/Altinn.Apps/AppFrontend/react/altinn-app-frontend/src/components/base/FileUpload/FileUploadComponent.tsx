import * as React from 'react';
import { FileRejection } from 'react-dropzone';
import { AltinnAppTheme } from 'altinn-shared/theme';
import { getLanguageFromKey } from 'altinn-shared/utils';
import { AltinnLoader } from 'altinn-shared/components';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import { isMobile } from 'react-device-detect';
import { IAttachment } from '../../../shared/resources/attachments';
import AttachmentDispatcher from '../../../shared/resources/attachments/attachmentActions';
import '../../../styles/FileUploadComponent.css';
import { IComponentValidations } from '../../../types';
import { renderValidationMessagesForComponent } from '../../../utils/render';
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

export function FileUploadComponent(props: IFileUploadProps) {
  const [attachments, dispatch] = React.useReducer(reducer, []);
  const [validations, setValidations] = React.useState([]);
  const [showFileUpload, setShowFileUpload] = React.useState(false);
  const mobileView = useMediaQuery('(max-width:992px)'); // breakpoint on altinn-modal

  function reducer(state, action) {
    if (action.type === 'replace') {
      return action.value;
    }

    if (action.type === 'add') {
      return state.concat(action.value);
    }

    if (action.type === 'delete') {
      const attachmentToDelete = state[action.index];
      if (!attachmentToDelete.uploaded) {
        return state;
      }
      attachmentToDelete.deleting = true;
      const newList = state.slice();
      newList[action.index] = attachmentToDelete;
      return newList;
    }
    return state;
  }

  const currentAttachments: IAttachment[] = useAppSelector(state => state.attachments.attachments[props.id] || emptyArray);

  React.useEffect(() => {
    dispatch({ type: 'replace', value: currentAttachments });
  }, [currentAttachments]);

  const getComponentValidations = (): IComponentValidations => {
    const validationMessages = {
      simpleBinding: {
        errors: [...(props.componentValidations?.simpleBinding?.errors || [])],
        warnings: [
          ...(props.componentValidations?.simpleBinding?.warnings || []),
        ],
        fixed: [...(props.componentValidations?.simpleBinding?.fixed || [])],
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
    const fileType = props.id; // component id used as filetype identifier for now, see issue #1364
    const tmpValidations: string[] = [];
    const totalAttachments =
      acceptedFiles.length + rejectedFiles.length + attachments.length;

    if (totalAttachments > props.maxNumberOfAttachments) {
      // if the user adds more attachments than max, all should be ignored
      tmpValidations.push(
        `${getLanguageFromKey(
          'form_filler.file_uploader_validation_error_exceeds_max_files_1',
          props.language,
        )} ${props.maxNumberOfAttachments} ${getLanguageFromKey(
          'form_filler.file_uploader_validation_error_exceeds_max_files_2',
          props.language,
        )}`,
      );
    } else {
      // we should upload all files, if any rejected files we should display an error
      acceptedFiles.forEach((file: File) => {
        if (
          attachments.length + newFiles.length <
          props.maxNumberOfAttachments
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
            props.id,
          );
        }
      });

      if (acceptedFiles.length > 0) {
        setShowFileUpload(
          props.displayMode === 'simple'
            ? false
            : attachments.length < props.maxNumberOfAttachments,
        );
      }

      if (rejectedFiles.length > 0) {
        rejectedFiles.forEach((fileRejection) => {
          if (fileRejection.file.size > props.maxFileSizeInMB * bytesInOneMB) {
            tmpValidations.push(
              `${fileRejection.file.name} ${getLanguageFromKey(
                'form_filler.file_uploader_validation_error_file_size',
                props.language,
              )}`,
            );
          } else {
            tmpValidations.push(
              `${getLanguageFromKey(
                'form_filler.file_uploader_validation_error_general_1',
                props.language,
              )} ${fileRejection.file.name} ${getLanguageFromKey(
                'form_filler.file_uploader_validation_error_general_2',
                props.language,
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
    const fileType = props.id; // component id used as filetype identifier for now, see issue #1364
    dispatch({ type: 'delete', index });
    AttachmentDispatcher.deleteAttachment(
      attachmentToDelete,
      fileType,
      props.id,
    );
  };

  const renderFileList = (): JSX.Element => {
    if (!attachments || attachments.length === 0) {
      return null;
    }
    return (
      <div id={`altinn-file-list${props.id}`} data-testid={props.id}>
        <table className='file-upload-table'>
          <thead>
            <tr className='blue-underline' id='altinn-file-list-row-header'>
              <th scope='col' style={mobileView ? { width: '65%' } : null}>
                {getLanguageFromKey(
                  'form_filler.file_uploader_list_header_name',
                  props.language,
                )}
              </th>
              {!mobileView ? (
                <th scope='col'>
                  {getLanguageFromKey(
                    'form_filler.file_uploader_list_header_file_size',
                    props.language,
                  )}
                </th>
              ) : null}
              <th scope='col'>
                {getLanguageFromKey(
                  'form_filler.file_uploader_list_header_status',
                  props.language,
                )}
              </th>
              <th scope='col'>
                <p className='sr-only'>
                  {getLanguageFromKey(
                    'form_filler.file_uploader_list_header_delete_sr',
                    props.language,
                  )}
                </p>
              </th>
            </tr>
          </thead>
          <tbody>
            {attachments.map((attachment: IAttachment, index: number) => {
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
                        {`${(attachment.size / bytesInOneMB).toFixed(
                          2,
                        )} ${getLanguageFromKey(
                          'form_filler.file_uploader_mb',
                          props.language,
                        )}`}
                      </div>
                    ) : null}
                  </td>
                  {!mobileView ? (
                    <td>
                      {`${(attachment.size / bytesInOneMB).toFixed(
                        2,
                      )} ${getLanguageFromKey(
                        'form_filler.file_uploader_mb',
                        props.language,
                      )}`}
                    </td>
                  ) : null}
                  <td>
                    {attachment.uploaded && (
                      <div>
                        {!mobileView
                          ? getLanguageFromKey(
                              'form_filler.file_uploader_list_status_done',
                              props.language,
                            )
                          : null}
                        <i
                          className='ai ai-check-circle'
                          aria-label={getLanguageFromKey(
                            'form_filler.file_uploader_list_status_done',
                            props.language,
                          )}
                          style={mobileView ? { marginLeft: '10px' } : null}
                        />
                      </div>
                    )}
                    {!attachment.uploaded && (
                      <AltinnLoader
                        id='loader-upload'
                        style={{
                          marginBottom: '1.6rem',
                          marginRight: '1.3rem',
                        }}
                        srContent={getLanguageFromKey(
                          'general.loading',
                          props.language,
                        )}
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
                      {!attachment.deleting && (
                        <>
                          {mobileView
                            ? getLanguageFromKey(
                                'general.delete',
                                props.language,
                              )
                            : getLanguageFromKey(
                                'form_filler.file_uploader_list_delete',
                                props.language,
                              )}
                          <i
                            className='ai ai-trash'
                            aria-label={getLanguageFromKey(
                              'general.delete',
                              props.language,
                            )}
                          />
                        </>
                      )}
                      {attachment.deleting && (
                        <AltinnLoader
                          id='loader-delete'
                          style={{
                            marginBottom: '1.6rem',
                            marginRight: '1.0rem',
                          }}
                          srContent={getLanguageFromKey(
                            'general.loading',
                            props.language,
                          )}
                        />
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
    if (attachments.length >= props.maxNumberOfAttachments) {
      return false;
    }
    return (
      props.displayMode !== 'simple' ||
      attachments.length === 0 ||
      showFileUpload === true
    );
  };

  const renderAddMoreAttachmentsButton = (): JSX.Element => {
    if (
      props.displayMode === 'simple' &&
      !showFileUpload &&
      attachments.length < props.maxNumberOfAttachments &&
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
            props.language,
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
      id={`altinn-fileuploader-${props.id}`}
      style={{ padding: '0px' }}
    >
      {shouldShowFileUpload() && (
        <DropzoneComponent
          id={props.id}
          isMobile={isMobile}
          language={props.language}
          maxFileSizeInMB={props.maxFileSizeInMB}
          readOnly={props.readOnly}
          onClick={handleClick}
          onDrop={handleDrop}
          hasValidationMessages={hasValidationMessages}
      />
      )}

      {shouldShowFileUpload() &&
        AttachmentsCounter({
          language: props.language,
          currentNumberOfAttachments: attachments.length,
          minNumberOfAttachments: props.minNumberOfAttachments,
          maxNumberOfAttachments: props.maxNumberOfAttachments
        })
      }

      {validationMessages.simpleBinding.errors.length > 0 &&
        showFileUpload &&
        renderValidationMessagesForComponent(
          validationMessages.simpleBinding,
          props.id,
        )}

      {renderFileList()}

      {!shouldShowFileUpload() &&
        AttachmentsCounter({
          language: props.language,
          currentNumberOfAttachments: attachments.length,
          minNumberOfAttachments: props.minNumberOfAttachments,
          maxNumberOfAttachments: props.maxNumberOfAttachments
        })
      }

      {validationMessages.simpleBinding.errors.length > 0 &&
        !showFileUpload &&
        renderValidationMessagesForComponent(
          validationMessages.simpleBinding,
          props.id,
        )}

      {renderAddMoreAttachmentsButton()}
    </div>
  );
}

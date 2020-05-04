/* eslint-disable react/prop-types */
import * as React from 'react';
import DropZone from 'react-dropzone';
import { useSelector } from 'react-redux';
import { AltinnAppTheme } from 'altinn-shared/theme';
import { getLanguageFromKey } from 'altinn-shared/utils';
import { AltinnLoader } from 'altinn-shared/components';
import { IAttachment } from '../../shared/resources/attachments';
import AttachmentDispatcher from '../../shared/resources/attachments/attachmentActions';
import '../../styles/FileUploadComponent.css';
import { IRuntimeState } from '../../types';
import { IComponentValidations } from '../../types/global';
import { renderValidationMessagesForComponent } from '../../utils/render';

import uuid = require('uuid');

export interface IFileUploadProps {
  displayMode: string;
  hasCustomFileEndings?: boolean;
  id: string;
  isValid?: boolean;
  componentValidations?: IComponentValidations;
  language: any;
  maxFileSizeInMB: number;
  maxNumberOfAttachments: number;
  minNumberOfAttachments: number;
  readOnly: boolean;
  validFileEndings?: string;
}

const baseStyle = {
  width: 'auto',
  height: '15.6rem',
  borderWidth: '2px',
  borderColor: AltinnAppTheme.altinnPalette.primary.blueMedium,
  borderStyle: 'dashed',
  cursor: 'pointer',
};
const activeStyle = {
  borderStyle: 'solid',
};
const rejectStyle = {
  borderStyle: 'solid',
  borderColor: AltinnAppTheme.altinnPalette.primary.red,
};
const validationErrorStyle = {
  borderStyle: 'dashed',
  borderColor: AltinnAppTheme.altinnPalette.primary.red,
};

export const bytesInOneMB = 1048576;
export const emptyArray = [];

export function FileUploadComponent(props: IFileUploadProps) {
  const [attachments, dispatch] = React.useReducer(reducer, []);
  const [validations, setValidations] = React.useState([]);
  const [showFileUpload, setShowFileUpload] = React.useState(false);

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
    }
    return [];
  }

  const currentAttachments: IAttachment[] = useSelector((state: IRuntimeState) => state.attachments.attachments[props.id] || emptyArray);

  React.useEffect(() => {
    dispatch({ type: 'replace', value: currentAttachments });
  }, [currentAttachments]);

  const getComponentValidations = (): IComponentValidations => {
    let validationMessages = props.componentValidations;
    validationMessages = JSON.parse(JSON.stringify(validationMessages || {}));
    if (!validationMessages || !validationMessages.simpleBinding) {
      validationMessages = {
        simpleBinding: {
          errors: [],
          warnings: [],
        },
      };
    }
    if (!validations || validations.length === 0) {
      return validationMessages;
    }
    validations.forEach((message) => {
      validationMessages.simpleBinding.errors.push(message);
    });
    return validationMessages;
  };

  const onDrop = (acceptedFiles: File[], rejectedFiles: File[]) => {
    const newFiles: IAttachment[] = [];
    const fileType = props.id; // component id used as filetype identifier for now, see issue #1364
    const tmpValidations: string[] = [];
    const totalAttachments = acceptedFiles.length + rejectedFiles.length + attachments.length;

    if (totalAttachments > props.maxNumberOfAttachments) {
      // if the user adds more attachments than max, all should be ignored
      tmpValidations.push(
        `${getLanguageFromKey('form_filler.file_uploader_validation_error_exceeds_max_files_1', props.language)
        } ${props.maxNumberOfAttachments} ${
          getLanguageFromKey('form_filler.file_uploader_validation_error_exceeds_max_files_2', props.language)}`,
      );
    } else {
      // we should upload all files, if any rejected files we should display an error
      acceptedFiles.forEach((file: File) => {
        if ((attachments.length + newFiles.length) < props.maxNumberOfAttachments) {
          const tmpId: string = uuid();
          newFiles.push({
            name: file.name, size: file.size, uploaded: false, id: tmpId, deleting: false,
          });
          AttachmentDispatcher.uploadAttachment(file, fileType, tmpId, props.id);
        }
      });

      if (acceptedFiles.length > 0) {
        setShowFileUpload((props.displayMode === 'simple') ? false :
          (attachments.length < props.maxNumberOfAttachments));
      }

      if (rejectedFiles.length > 0) {
        rejectedFiles.forEach((file) => {
          if (file.size > (props.maxFileSizeInMB * bytesInOneMB)) {
            tmpValidations.push(
              `${file.name} ${
                getLanguageFromKey('form_filler.file_uploader_validation_error_file_size', props.language)}`,
            );
          } else {
            tmpValidations.push(
              `${getLanguageFromKey('form_filler.file_uploader_validation_error_general_1', props.language)} ${
                file.name} ${
                getLanguageFromKey('form_filler.file_uploader_validation_error_general_2', props.language)}`,
            );
          }
        });
      }
    }
    dispatch({ type: 'add', value: newFiles });
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
    AttachmentDispatcher.deleteAttachment(attachmentToDelete, fileType, props.id);
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
              <th scope='col'>{getLanguageFromKey('form_filler.file_uploader_list_header_name', props.language)}</th>
              <th scope='col'>{getLanguageFromKey('form_filler.file_uploader_list_header_file_size', props.language)}</th>
              <th scope='col'>{getLanguageFromKey('form_filler.file_uploader_list_header_status', props.language)}</th>
              <th scope='col'>
                <p className='sr-only'>
                  {getLanguageFromKey('form_filler.file_uploader_list_header_delete_sr', props.language)}
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
                  <td>{attachment.name}</td>
                  <td>
                    {`${(attachment.size / bytesInOneMB).toFixed(2)} ${
                      getLanguageFromKey('form_filler.file_uploader_mb', props.language)}`}
                  </td >
                  <td>
                    {attachment.uploaded &&
                      <div>
                        {getLanguageFromKey('form_filler.file_uploader_list_status_done', props.language)}
                        < i className='ai ai-check-circle' />
                      </div>
                    }
                    {!attachment.uploaded &&
                      <AltinnLoader
                        id='loader-upload'
                        style={{ marginBottom: '1.6rem', marginRight: '1.3rem' }}
                        srContent={getLanguageFromKey('general.loading', props.language)}
                      />
                    }
                  </td>
                  <td>
                    <div
                      onClick={handleDeleteFile.bind(this, index)}
                      id={`attachment-delete-${index}`}
                      onKeyPress={handleDeleteKeypress.bind(this, index)}
                      tabIndex={0}
                      role='button'
                    >
                      {!attachment.deleting &&
                        <>
                          {getLanguageFromKey('form_filler.file_uploader_list_delete', props.language)}
                          <i className='ai ai-trash' />
                        </>
                      }
                      {attachment.deleting &&
                        <AltinnLoader
                          id='loader-delete'
                          style={{ marginBottom: '1.6rem', marginRight: '1.0rem' }}
                          srContent={getLanguageFromKey('general.loading', props.language)}
                        />
                      }
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

  const renderFileUploadContent = (): JSX.Element => {
    return (
      <div className='container'>
        <div className='col text-center icon' style={{ marginTop: '3.5rem' }} >
          <i className='ai ai-upload' />
        </div>
        <div className='col text-center'>
          <label
            htmlFor={props.id}
            className='file-upload-text-bold'
          >
            {getLanguageFromKey('form_filler.file_uploader_drag', props.language)}
            <span className='file-upload-text-bold blue-underline'>
              {` ${getLanguageFromKey('form_filler.file_uploader_find', props.language)}`}
            </span>
          </label>
        </div>
        <div className='col text-center'>
          <label
            htmlFor={props.id}
            className='file-upload-text'
          >
            {getLanguageFromKey('form_filler.file_uploader_valid_file_format', props.language)}
            {props.hasCustomFileEndings ? (` ${props.validFileEndings}`) :
              (` ${getLanguageFromKey('form_filler.file_upload_valid_file_format_all', props.language)}`)}
          </label>
        </div>
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
    return (props.displayMode !== 'simple') || (attachments.length === 0) ||
        (showFileUpload === true);
  };

  const renderAddMoreAttachmentsButton = (): JSX.Element => {
    if (props.displayMode === 'simple' && !showFileUpload &&
      (attachments.length < props.maxNumberOfAttachments) && attachments.length > 0) {
      return (
        <button
          className='file-upload-button blue-underline'
          onClick={updateShowFileUpload}
          type='button'
        >
          {getLanguageFromKey('form_filler.file_uploader_add_attachment', props.language)}
        </button>
      );
    }
    return null;
  };

  const renderAttachmentsCounter = (): JSX.Element => {
    return (
      <div
        className='file-upload-text-bold-small'
        id='number-of-attachments'
      >
        {
          `${getLanguageFromKey('form_filler.file_uploader_number_of_files', props.language)} ${
            props.minNumberOfAttachments ? `${attachments.length}/${props.maxNumberOfAttachments}`
              : attachments.length}.`
        }
      </div>
    );
  };

  const validationMessages = getComponentValidations();
  const hasValidationMessages: boolean = validationMessages.simpleBinding.errors.length > 0;
  return (
    <div
      className='container'
      id={`altinn-fileuploader-${props.id}`}
    >
      {shouldShowFileUpload() &&
      <div>
        <div
          className='file-upload-text-bold-small'
          id='max-size'
        >
          {
            `${getLanguageFromKey('form_filler.file_uploader_max_size', props.language)
            } ${props.maxFileSizeInMB} ${
              getLanguageFromKey('form_filler.file_uploader_mb', props.language)}`
          }
        </div>
        <DropZone
          onDrop={onDrop}
          maxSize={props.maxFileSizeInMB * bytesInOneMB} // mb to bytes
          disabled={props.readOnly}
          accept={(props.hasCustomFileEndings) ? props.validFileEndings : null}
        >
          {({
            getRootProps, getInputProps, isDragActive, isDragReject,
          }) => {
            let styles = { ...baseStyle };
            styles = isDragActive ? { ...styles, ...activeStyle } : styles;
            styles = isDragReject ? { ...styles, ...rejectStyle } : styles;
            styles = (hasValidationMessages) ? { ...styles, ...validationErrorStyle } : styles;

            return (
              <div
                {...getRootProps()}
                style={styles}
                id={`altinn-drop-zone-${props.id}`}
                className={`file-upload${hasValidationMessages ? ' file-upload-invalid' : ''}`}
                aria-describedby='max-size number-of-attachments'
                role='button'
              >
                <input
                  {...getInputProps()}
                  id={props.id}
                />
                {renderFileUploadContent()}
              </div>
            );
          }}
        </DropZone>
      </div>
      }

      {shouldShowFileUpload() && renderAttachmentsCounter()}

      {(validationMessages.simpleBinding.errors.length > 0 && showFileUpload) &&
          renderValidationMessagesForComponent(validationMessages.simpleBinding, props.id)
      }

      {renderFileList()}

      {!shouldShowFileUpload() && renderAttachmentsCounter()}

      {(validationMessages.simpleBinding.errors.length > 0 && !showFileUpload) &&
          renderValidationMessagesForComponent(validationMessages.simpleBinding, props.id)
      }

      {renderAddMoreAttachmentsButton()}

    </div>
  );
}

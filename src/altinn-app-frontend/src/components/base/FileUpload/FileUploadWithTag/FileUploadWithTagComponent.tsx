import * as React from 'react';
import { FileRejection } from 'react-dropzone';
import { useDispatch, useSelector } from 'react-redux';
import { getLanguageFromKey } from 'altinn-shared/utils';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import { isMobile } from 'react-device-detect';
import { IAttachment } from '../../../../shared/resources/attachments';
import AttachmentDispatcher from '../../../../shared/resources/attachments/attachmentActions';
import { IMapping, IRuntimeState } from '../../../../types';
import { renderValidationMessagesForComponent } from '../../../../utils/render';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { v4 as uuidv4 } from 'uuid';
import { getFileUploadWithTagComponentValidations, isAttachmentError, isNotAttachmentError, parseFileUploadComponentWithTagValidationObject } from 'src/utils/formComponentUtils';
import { AttachmentsCounter } from '../shared/render';
import { FileList } from './FileListComponent';
import { DropzoneComponent } from '../shared/DropzoneComponent';
import { IFileUploadGenericProps } from '../shared/props';
import { IComponentProps } from 'src/components';
import { getOptionLookupKey } from 'src/utils/options';

export interface IFileUploadWithTagProps extends IFileUploadGenericProps {
  optionsId: string;
  mapping?: IMapping;
}

export const bytesInOneMB = 1048576;
export const emptyArray = [];

export function FileUploadWithTagComponent({
  id,
  componentValidations,
  language,
  maxFileSizeInMB,
  readOnly,
  maxNumberOfAttachments,
  minNumberOfAttachments,
  hasCustomFileEndings,
  validFileEndings,
  optionsId,
  mapping,
  getTextResource,
  getTextResourceAsString,
  textResourceBindings
}: IFileUploadWithTagProps): JSX.Element {
  const dataDispatch = useDispatch();
  const [validations, setValidations] = React.useState<Array<{ id: string, message: string }>>([]);
  const mobileView = useMediaQuery('(max-width:992px)'); // breakpoint on altinn-modal
  const options = useSelector((state: IRuntimeState) => state.optionState.options[getOptionLookupKey(optionsId, mapping)]?.options);
  const editIndex = useSelector((state: IRuntimeState) => state.formLayout.uiConfig.fileUploadersWithTag[id]?.editIndex ?? -1);
  const chosenOptions = useSelector((state: IRuntimeState) => state.formLayout.uiConfig.fileUploadersWithTag[id]?.chosenOptions ?? {});

  const attachments: IAttachment[] = useSelector(
    (state: IRuntimeState) => state.attachments.attachments[id] || emptyArray,
  );

  const setValidationsFromArray = (validationArray: string[]) => {
    setValidations(
      parseFileUploadComponentWithTagValidationObject(validationArray),
    );
  };

  const setEditIndex = (index: number) => {
    dataDispatch(FormLayoutActions.updateFileUploaderWithTagEditIndex({
      uploader: id, index
    }));
  };

  const handleClick = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
    event.preventDefault();
  };

  const handleEdit = (index) => {
    if (editIndex === -1 || editIndex !== index) {
      setEditIndex(index);
    } else {
      setEditIndex(-1);
    }
  };

  const handleSave = (attachment: IAttachment) => {
    if (chosenOptions[attachment.id] !== undefined && chosenOptions[attachment.id].length !== 0) {
      setEditIndex(-1);
      if (attachment.tags === undefined || chosenOptions[attachment.id] !== attachment.tags[0]) {
        setAttachmentTag(attachment, chosenOptions[attachment.id]);
      }
      setValidations(validations.filter((obj) => obj.id !== attachment.id)); // Remove old validation if exists
    } else {
      const tmpValidations: { id: string, message: string }[] = [];
      tmpValidations.push(
        {
          id: attachment.id,
          message: `${getLanguageFromKey('form_filler.file_uploader_validation_error_no_chosen_tag', language)} ${getTextResource(textResourceBindings.tagTitle).toString().toLowerCase()}.`,
        },
      );
      setValidations(validations.filter((obj) => obj.id !== tmpValidations[0].id).concat(tmpValidations));
    }
  };

  const handleDropdownDataChange = (attachmentId: string, value: string) => {
    if (value !== undefined) {
      const option = options?.find((o) => o.value === value);
      if (option !== undefined) {
        dataDispatch(FormLayoutActions.updateFileUploaderWithTagChosenOptions({
          uploader: id, id: attachmentId, option
        }));
      } else {
        console.error(`Could not find option for ${value}`);
      }
    }
  };

  const setAttachmentTag = (attachment: IAttachment, optionValue: string) => {
    const option = options?.find((o) => o.value === optionValue);
    if (option !== undefined) {
      AttachmentDispatcher.updateAttachment(attachment, id, option.value, id);
    } else {
      console.error(`Could not find option for ${optionValue}`);
    }
  };

  const shouldShowFileUpload = (): boolean => {
    return attachments.length < maxNumberOfAttachments
  };

  const handleDrop = (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    const newFiles: IAttachment[] = [];
    const fileType = id;
    const tmpValidations: string[] = [];
    const totalAttachments = acceptedFiles.length + rejectedFiles.length + attachments.length;

    if (totalAttachments > maxNumberOfAttachments) {
      // if the user adds more attachments than max, all should be ignored
      tmpValidations.push(
        `${getLanguageFromKey('form_filler.file_uploader_validation_error_exceeds_max_files_1', language)
        } ${maxNumberOfAttachments} ${getLanguageFromKey('form_filler.file_uploader_validation_error_exceeds_max_files_2', language)}`,
      );
    } else {
      // we should upload all files, if any rejected files we should display an error
      acceptedFiles.forEach((file: File) => {
        if ((attachments.length + newFiles.length) < maxNumberOfAttachments) {
          const tmpId: string = uuidv4();
          newFiles.push({
            name: file.name, size: file.size, uploaded: false, tags: [], id: tmpId, deleting: false, updating: false,
          });
          AttachmentDispatcher.uploadAttachment(file, fileType, tmpId, id);
        }
      });

      if (rejectedFiles.length > 0) {
        rejectedFiles.forEach((fileRejection) => {
          if (fileRejection.file.size > (maxFileSizeInMB * bytesInOneMB)) {
            tmpValidations.push(
              `${fileRejection.file.name} ${getLanguageFromKey('form_filler.file_uploader_validation_error_file_size', language)}`,
            );
          } else {
            tmpValidations.push(
              `${getLanguageFromKey('form_filler.file_uploader_validation_error_general_1', language)} ${fileRejection.file.name} ${getLanguageFromKey('form_filler.file_uploader_validation_error_general_2', language)}`,
            );
          }
        });
      }
    }
    setValidationsFromArray(tmpValidations);
  };

  // Get validations and filter general from identified validations.
  const tmpValidationMessages = getFileUploadWithTagComponentValidations(componentValidations, validations);
  const validationMessages = { errors: tmpValidationMessages.filter(isNotAttachmentError).map((el) => (el.message)) };
  const attachmentValidationMessages = tmpValidationMessages.filter(isAttachmentError);
  const hasValidationMessages: boolean = validationMessages.errors.length > 0;

  return (
    <div
      className='container'
      id={`altinn-fileuploader-${id}`}
      style={{ padding: '0px' }}
    >
      {shouldShowFileUpload() &&
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
      }

      {shouldShowFileUpload() &&
        AttachmentsCounter({
          language: language,
          currentNumberOfAttachments: attachments.length,
          minNumberOfAttachments: minNumberOfAttachments,
          maxNumberOfAttachments: maxNumberOfAttachments
        })
      }

      {(hasValidationMessages && shouldShowFileUpload()) &&
        renderValidationMessagesForComponent(validationMessages, id)
      }

      <FileList
        id={id}
        attachments={attachments}
        attachmentValidations={attachmentValidationMessages}
        language={language}
        editIndex={editIndex}
        mobileView={mobileView}
        readOnly={readOnly}
        options={options}
        getTextResource={getTextResource}
        getTextResourceAsString={getTextResourceAsString}
        onEdit={handleEdit}
        onSave={handleSave}
        onDropdownDataChange={handleDropdownDataChange}
        setEditIndex={setEditIndex}
        textResourceBindings={textResourceBindings}
        {...({} as IComponentProps)}
      />

      {!shouldShowFileUpload() &&
        AttachmentsCounter({
          language: language,
          currentNumberOfAttachments: attachments.length,
          minNumberOfAttachments: minNumberOfAttachments,
          maxNumberOfAttachments: maxNumberOfAttachments
        })
      }

      {(hasValidationMessages && !shouldShowFileUpload()) &&
        renderValidationMessagesForComponent(validationMessages, id)
      }

    </div>
  );
}


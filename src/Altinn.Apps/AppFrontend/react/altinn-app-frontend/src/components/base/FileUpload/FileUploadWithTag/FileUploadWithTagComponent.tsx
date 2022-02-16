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

export function FileUploadWithTagComponent(props: IFileUploadWithTagProps): JSX.Element {
  const dataDispatch = useDispatch();
  const [validations, setValidations] = React.useState<Array<{ id: string, message: string }>>([]);
  const mobileView = useMediaQuery('(max-width:992px)'); // breakpoint on altinn-modal
  const options = useSelector((state: IRuntimeState) => state.optionState.options[getOptionLookupKey(props.optionsId, props.mapping)]?.options);
  const editIndex = useSelector((state: IRuntimeState) => state.formLayout.uiConfig.fileUploadersWithTag[props.id]?.editIndex ?? -1);
  const chosenOptions = useSelector((state: IRuntimeState) => state.formLayout.uiConfig.fileUploadersWithTag[props.id]?.chosenOptions ?? {});

  const attachments: IAttachment[] = useSelector(
    (state: IRuntimeState) => state.attachments.attachments[props.id] || emptyArray,
  );

  const setValidationsFromArray = (validationArray: string[]) => {
    setValidations(
      parseFileUploadComponentWithTagValidationObject(validationArray),
    );
  };

  const setEditIndex = (index: number) => {
    dataDispatch(FormLayoutActions.updateFileUploaderWithTagEditIndex({
      uploader: props.id, index
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
          message: `${getLanguageFromKey('form_filler.file_uploader_validation_error_no_chosen_tag', props.language)} ${props.getTextResource(props.textResourceBindings.tagTitle).toString().toLowerCase()}.`,
        },
      );
      setValidations(validations.filter((obj) => obj.id !== tmpValidations[0].id).concat(tmpValidations));
    }
  };

  const handleDropdownDataChange = (id: string, value: string) => {
    if (value !== undefined) {
      const option = options?.find((o) => o.value === value);
      if (option !== undefined) {
        dataDispatch(FormLayoutActions.updateFileUploaderWithTagChosenOptions({
          uploader: props.id, id, option
        }));
      } else {
        console.error(`Could not find option for ${value}`);
      }
    }
  };

  const setAttachmentTag = (attachment: IAttachment, optionValue: string) => {
    const option = options?.find((o) => o.value === optionValue);
    if (option !== undefined) {
      AttachmentDispatcher.updateAttachment(attachment, props.id, option.value, props.id);
    } else {
      console.error(`Could not find option for ${optionValue}`);
    }
  };

  const shouldShowFileUpload = (): boolean => {
    return attachments.length < props.maxNumberOfAttachments
  };

  const handleDrop = (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    const newFiles: IAttachment[] = [];
    const fileType = props.id;
    const tmpValidations: string[] = [];
    const totalAttachments = acceptedFiles.length + rejectedFiles.length + attachments.length;

    if (totalAttachments > props.maxNumberOfAttachments) {
      // if the user adds more attachments than max, all should be ignored
      tmpValidations.push(
        `${getLanguageFromKey('form_filler.file_uploader_validation_error_exceeds_max_files_1', props.language)
        } ${props.maxNumberOfAttachments} ${getLanguageFromKey('form_filler.file_uploader_validation_error_exceeds_max_files_2', props.language)}`,
      );
    } else {
      // we should upload all files, if any rejected files we should display an error
      acceptedFiles.forEach((file: File) => {
        if ((attachments.length + newFiles.length) < props.maxNumberOfAttachments) {
          const tmpId: string = uuidv4();
          newFiles.push({
            name: file.name, size: file.size, uploaded: false, tags: [], id: tmpId, deleting: false, updating: false,
          });
          AttachmentDispatcher.uploadAttachment(file, fileType, tmpId, props.id);
        }
      });

      if (rejectedFiles.length > 0) {
        rejectedFiles.forEach((fileRejection) => {
          if (fileRejection.file.size > (props.maxFileSizeInMB * bytesInOneMB)) {
            tmpValidations.push(
              `${fileRejection.file.name} ${getLanguageFromKey('form_filler.file_uploader_validation_error_file_size', props.language)}`,
            );
          } else {
            tmpValidations.push(
              `${getLanguageFromKey('form_filler.file_uploader_validation_error_general_1', props.language)} ${fileRejection.file.name} ${getLanguageFromKey('form_filler.file_uploader_validation_error_general_2', props.language)}`,
            );
          }
        });
      }
    }
    setValidationsFromArray(tmpValidations);
  };

  // Get validations and filter general from identified validations.
  const tmpValidationMessages = getFileUploadWithTagComponentValidations(props.componentValidations, validations);
  const validationMessages = { errors: tmpValidationMessages.filter(isNotAttachmentError).map((el) => (el.message)) };
  const attachmentValidationMessages = tmpValidationMessages.filter(isAttachmentError);
  const hasValidationMessages: boolean = validationMessages.errors.length > 0;

  return (
    <div
      className='container'
      id={`altinn-fileuploader-${props.id}`}
      style={{ padding: '0px' }}
    >
      {shouldShowFileUpload() &&
        <DropzoneComponent
          id={props.id}
          isMobile={isMobile}
          language={props.language}
          maxFileSizeInMB={props.maxFileSizeInMB}
          readOnly={props.readOnly}
          onClick={handleClick}
          onDrop={handleDrop}
          hasValidationMessages={hasValidationMessages}
          hasCustomFileEndings={props.hasCustomFileEndings}
          validFileEndings={props.validFileEndings}
        />
      }

      {shouldShowFileUpload() &&
        AttachmentsCounter({
          language: props.language,
          currentNumberOfAttachments: attachments.length,
          minNumberOfAttachments: props.minNumberOfAttachments,
          maxNumberOfAttachments: props.maxNumberOfAttachments
        })
      }

      {(hasValidationMessages && shouldShowFileUpload()) &&
        renderValidationMessagesForComponent(validationMessages, props.id)
      }

      <FileList
        id={props.id}
        attachments={attachments}
        attachmentValidations={attachmentValidationMessages}
        language={props.language}
        editIndex={editIndex}
        mobileView={mobileView}
        readOnly={props.readOnly}
        options={options}
        getTextResource={props.getTextResource}
        getTextResourceAsString={props.getTextResourceAsString}
        onEdit={handleEdit}
        onSave={handleSave}
        onDropdownDataChange={handleDropdownDataChange}
        setEditIndex={setEditIndex}
        textResourceBindings={props.textResourceBindings}
        {...({} as IComponentProps)}
      />

      {!shouldShowFileUpload() &&
        AttachmentsCounter({
          language: props.language,
          currentNumberOfAttachments: attachments.length,
          minNumberOfAttachments: props.minNumberOfAttachments,
          maxNumberOfAttachments: props.maxNumberOfAttachments
        })
      }

      {(hasValidationMessages && !shouldShowFileUpload()) &&
        renderValidationMessagesForComponent(validationMessages, props.id)
      }

    </div>
  );
}


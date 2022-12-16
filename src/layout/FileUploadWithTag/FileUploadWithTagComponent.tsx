import * as React from 'react';
import { isMobile } from 'react-device-detect';
import type { FileRejection } from 'react-dropzone';

import useMediaQuery from '@material-ui/core/useMediaQuery';
import { v4 as uuidv4 } from 'uuid';

import { useAppDispatch, useAppSelector } from 'src/common/hooks';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { DropzoneComponent, handleRejectedFiles } from 'src/layout/FileUpload/shared';
import { AttachmentsCounter } from 'src/layout/FileUpload/shared/render';
import { FileList } from 'src/layout/FileUploadWithTag/FileListComponent';
import { AttachmentActions } from 'src/shared/resources/attachments/attachmentSlice';
import {
  getFileUploadWithTagComponentValidations,
  isAttachmentError,
  isNotAttachmentError,
  parseFileUploadComponentWithTagValidationObject,
} from 'src/utils/formComponentUtils';
import { getOptionLookupKey } from 'src/utils/options';
import { renderValidationMessagesForComponent } from 'src/utils/render';
import { getLanguageFromKey } from 'src/utils/sharedUtils';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IAttachment } from 'src/shared/resources/attachments';
import type { IRuntimeState } from 'src/types';

export type IFileUploadWithTagProps = PropsFromGenericComponent<'FileUploadWithTag'>;

export function FileUploadWithTagComponent({
  id,
  baseComponentId,
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
  textResourceBindings,
  dataModelBindings,
}: IFileUploadWithTagProps): JSX.Element {
  const dataDispatch = useAppDispatch();
  const [validations, setValidations] = React.useState<Array<{ id: string; message: string }>>([]);
  const mobileView = useMediaQuery('(max-width:992px)'); // breakpoint on altinn-modal
  const options = useAppSelector(
    (state: IRuntimeState) => state.optionState.options[getOptionLookupKey({ id: optionsId, mapping })]?.options,
  );
  const editIndex = useAppSelector(
    (state: IRuntimeState) =>
      (state.formLayout.uiConfig.fileUploadersWithTag &&
        state.formLayout.uiConfig.fileUploadersWithTag[id]?.editIndex) ??
      -1,
  );
  const chosenOptions = useAppSelector(
    (state: IRuntimeState) =>
      (state.formLayout.uiConfig.fileUploadersWithTag &&
        state.formLayout.uiConfig.fileUploadersWithTag[id]?.chosenOptions) ??
      {},
  );

  const attachments: IAttachment[] = useAppSelector((state: IRuntimeState) => state.attachments.attachments[id] || []);

  const setValidationsFromArray = (validationArray: string[]) => {
    setValidations(parseFileUploadComponentWithTagValidationObject(validationArray));
  };

  const setEditIndex = (index: number) => {
    dataDispatch(
      FormLayoutActions.updateFileUploaderWithTagEditIndex({
        componentId: id,
        baseComponentId: baseComponentId || id,
        index,
      }),
    );
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
      const tmpValidations: { id: string; message: string }[] = [];
      tmpValidations.push({
        id: attachment.id,
        message: `${getLanguageFromKey('form_filler.file_uploader_validation_error_no_chosen_tag', language)} ${(
          getTextResource(textResourceBindings?.tagTitle || '') || ''
        )
          .toString()
          .toLowerCase()}.`,
      });
      setValidations(validations.filter((obj) => obj.id !== tmpValidations[0].id).concat(tmpValidations));
    }
  };

  const handleDropdownDataChange = (attachmentId: string, value: string) => {
    if (value !== undefined) {
      const option = options?.find((o) => o.value === value);
      if (option !== undefined) {
        dataDispatch(
          FormLayoutActions.updateFileUploaderWithTagChosenOptions({
            componentId: id,
            baseComponentId: baseComponentId || id,
            id: attachmentId,
            option,
          }),
        );
      } else {
        console.error(`Could not find option for ${value}`);
      }
    }
  };

  const setAttachmentTag = (attachment: IAttachment, optionValue: string) => {
    const option = options?.find((o) => o.value === optionValue);
    if (option !== undefined) {
      dataDispatch(
        AttachmentActions.updateAttachment({
          attachment,
          componentId: id,
          baseComponentId: baseComponentId || id,
          tag: option.value,
        }),
      );
    } else {
      console.error(`Could not find option for ${optionValue}`);
    }
  };

  const shouldShowFileUpload = (): boolean => {
    return attachments.length < maxNumberOfAttachments;
  };

  const handleDrop = (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    const newFiles: IAttachment[] = [];
    const fileType = baseComponentId || id;
    const totalAttachments = acceptedFiles.length + rejectedFiles.length + attachments.length;

    if (totalAttachments > maxNumberOfAttachments) {
      // if the user adds more attachments than max, all should be ignored
      setValidationsFromArray([
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
            tags: [],
            id: tmpId,
            deleting: false,
            updating: false,
          });
          dataDispatch(
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
      const rejections = handleRejectedFiles({
        language,
        rejectedFiles,
        maxFileSizeInMB,
      });
      setValidationsFromArray(rejections);
    }
  };

  // Get validations and filter general from identified validations.
  const tmpValidationMessages = getFileUploadWithTagComponentValidations(componentValidations, validations);
  const validationMessages = {
    errors: tmpValidationMessages.filter(isNotAttachmentError).map((el) => el.message),
  };
  const attachmentValidationMessages = tmpValidationMessages.filter(isAttachmentError);
  const hasValidationMessages: boolean = validationMessages.errors.length > 0;

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
          maxNumberOfAttachments: maxNumberOfAttachments,
        })}

      {hasValidationMessages && shouldShowFileUpload() && renderValidationMessagesForComponent(validationMessages, id)}

      <FileList
        {...({} as PropsFromGenericComponent<'FileUploadWithTag'>)}
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
        dataModelBindings={dataModelBindings}
      />

      {!shouldShowFileUpload() &&
        AttachmentsCounter({
          language: language,
          currentNumberOfAttachments: attachments.length,
          minNumberOfAttachments: minNumberOfAttachments,
          maxNumberOfAttachments: maxNumberOfAttachments,
        })}

      {hasValidationMessages && !shouldShowFileUpload() && renderValidationMessagesForComponent(validationMessages, id)}
    </div>
  );
}

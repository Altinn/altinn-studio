import React from 'react';
import type { FileRejection } from 'react-dropzone';

import { v4 as uuidv4 } from 'uuid';

import { AttachmentActions } from 'src/features/attachments/attachmentSlice';
import { FormLayoutActions } from 'src/features/layout/formLayoutSlice';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { useIsMobileOrTablet } from 'src/hooks/useIsMobile';
import { useLanguage } from 'src/hooks/useLanguage';
import { DropzoneComponent } from 'src/layout/FileUpload/shared/DropzoneComponent';
import { handleRejectedFiles } from 'src/layout/FileUpload/shared/handleRejectedFiles';
import { AttachmentsCounter } from 'src/layout/FileUpload/shared/render';
import { FileList } from 'src/layout/FileUploadWithTag/FileListComponent';
import {
  getFileUploadWithTagComponentValidations,
  isAttachmentError,
  isNotAttachmentError,
  parseFileUploadComponentWithTagValidationObject,
} from 'src/utils/formComponentUtils';
import { getOptionLookupKey } from 'src/utils/options';
import { renderValidationMessagesForComponent } from 'src/utils/render';
import type { IAttachment } from 'src/features/attachments';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IRuntimeState } from 'src/types';

export type IFileUploadWithTagProps = PropsFromGenericComponent<'FileUploadWithTag'>;

export function FileUploadWithTagComponent(props: IFileUploadWithTagProps): JSX.Element {
  const { componentValidations, language, getTextResource, getTextResourceAsString } = props;
  const {
    id,
    baseComponentId,
    maxFileSizeInMB,
    readOnly,
    maxNumberOfAttachments,
    minNumberOfAttachments,
    hasCustomFileEndings,
    validFileEndings,
    optionsId,
    mapping,
    textResourceBindings,
    dataModelBindings,
  } = props.node.item;
  const dataDispatch = useAppDispatch();
  const [validations, setValidations] = React.useState<Array<{ id: string; message: string }>>([]);
  const mobileView = useIsMobileOrTablet();
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
  const { langAsString } = useLanguage();
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

  const handleEdit = (index: number) => {
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
        message: `${langAsString('form_filler.file_uploader_validation_error_no_chosen_tag')} ${(
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

  const shouldShowFileUpload = (): boolean => attachments.length < maxNumberOfAttachments;

  const handleDrop = (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    const fileType = baseComponentId || id;
    const totalAttachments = acceptedFiles.length + rejectedFiles.length + attachments.length;

    if (totalAttachments > maxNumberOfAttachments) {
      // if the user adds more attachments than max, all should be ignored
      setValidationsFromArray([
        `${langAsString(
          'form_filler.file_uploader_validation_error_exceeds_max_files_1',
        )} ${maxNumberOfAttachments} ${langAsString('form_filler.file_uploader_validation_error_exceeds_max_files_2')}`,
      ]);
    } else {
      // we should upload all files, if any rejected files we should display an error
      acceptedFiles.forEach((file: File, index) => {
        dataDispatch(
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
          hasValidationMessages={hasValidationMessages}
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

      {hasValidationMessages && shouldShowFileUpload() && renderValidationMessagesForComponent(validationMessages, id)}

      <FileList
        text={props.text}
        shouldFocus={props.shouldFocus}
        legend={props.legend}
        label={props.label}
        formData={props.formData}
        handleDataChange={props.handleDataChange}
        node={props.node}
        attachments={attachments}
        attachmentValidations={attachmentValidationMessages}
        language={language}
        editIndex={editIndex}
        mobileView={mobileView}
        options={options}
        getTextResource={getTextResource}
        getTextResourceAsString={getTextResourceAsString}
        onEdit={handleEdit}
        onSave={handleSave}
        onDropdownDataChange={handleDropdownDataChange}
        setEditIndex={setEditIndex}
      />

      {!shouldShowFileUpload() &&
        AttachmentsCounter({
          language,
          currentNumberOfAttachments: attachments.length,
          minNumberOfAttachments,
          maxNumberOfAttachments,
        })}

      {hasValidationMessages && !shouldShowFileUpload() && renderValidationMessagesForComponent(validationMessages, id)}
    </div>
  );
}

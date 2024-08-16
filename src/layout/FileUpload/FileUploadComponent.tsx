import React from 'react';
import { toast } from 'react-toastify';
import type { JSX } from 'react';
import type { FileRejection } from 'react-dropzone';

import { Label } from 'src/components/label/Label';
import { useAttachmentsFor, useAttachmentsUploader } from 'src/features/attachments/AttachmentsContext';
import {
  AttachmentsMappedToFormDataProvider,
  useAttachmentsMappedToFormData,
} from 'src/features/attachments/useAttachmentsMappedToFormData';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useGetOptions } from 'src/features/options/useGetOptions';
import { ComponentValidations } from 'src/features/validation/ComponentValidations';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { hasValidationErrors } from 'src/features/validation/utils';
import { useIsMobileOrTablet } from 'src/hooks/useIsMobile';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { DropzoneComponent } from 'src/layout/FileUpload/DropZone/DropzoneComponent';
import classes from 'src/layout/FileUpload/FileUploadComponent.module.css';
import { FileTable } from 'src/layout/FileUpload/FileUploadTable/FileTable';
import { handleRejectedFiles } from 'src/layout/FileUpload/handleRejectedFiles';
import type { PropsFromGenericComponent } from 'src/layout';

export type IFileUploadWithTagProps = PropsFromGenericComponent<'FileUpload' | 'FileUploadWithTag'>;

export function FileUploadComponent({ node }: IFileUploadWithTagProps): React.JSX.Element {
  const {
    id,
    maxFileSizeInMB,
    readOnly,
    displayMode,
    maxNumberOfAttachments,
    minNumberOfAttachments,
    hasCustomFileEndings,
    validFileEndings,
    textResourceBindings,
  } = node.item;
  const [showFileUpload, setShowFileUpload] = React.useState(false);
  const mobileView = useIsMobileOrTablet();
  const attachments = useAttachmentsFor(node);
  const uploadAttachment = useAttachmentsUploader();
  const mappingTools = useAttachmentsMappedToFormData(node);

  const validations = useUnifiedValidationsForNode(node);
  const componentValidations = validations?.filter((v) => !v.meta?.attachmentId);

  const langTools = useLanguage();

  const { options } = useGetOptions({
    ...node.item,
    valueType: 'single',
    node,
    removeDuplicates: true,
    dataModelBindings: undefined,
  });

  const canUploadMoreAttachments = attachments.length < maxNumberOfAttachments;
  const isComplexMode = displayMode !== 'simple';
  const isSimpleModeWithNoAttachments = displayMode === 'simple' && attachments.length === 0;

  const shouldShowFileUpload =
    canUploadMoreAttachments && (isComplexMode || isSimpleModeWithNoAttachments || showFileUpload);

  const AddMoreAttachmentsButton = (): JSX.Element | null => {
    const canShowButton =
      displayMode === 'simple' &&
      !showFileUpload &&
      attachments.length < maxNumberOfAttachments &&
      attachments.length > 0;

    if (!canShowButton) {
      return null;
    }
    return (
      <button
        className={classes.fileUploadButton}
        onClick={() => setShowFileUpload(true)}
      >
        <Lang id={'form_filler.file_uploader_add_attachment'} />
      </button>
    );
  };

  const handleDrop = (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    const totalAttachments = acceptedFiles.length + rejectedFiles.length + attachments.length;

    if (totalAttachments > maxNumberOfAttachments) {
      // if the user adds more attachments than max, all should be ignored
      toast(
        <Lang
          id={'form_filler.file_uploader_validation_error_exceeds_max_files'}
          params={[maxNumberOfAttachments]}
        />,
        { type: 'error' },
      );
      return;
    }
    // we should upload all files, if any rejected files we should display an error
    acceptedFiles.forEach((file: File) => {
      uploadAttachment({ file, node }).then((id) => {
        id && mappingTools.addAttachment(id);
      });
    });

    if (acceptedFiles.length > 0) {
      setShowFileUpload(displayMode === 'simple' ? false : attachments.length < maxNumberOfAttachments);
    }
    const rejections = handleRejectedFiles({
      langTools,
      rejectedFiles,
      maxFileSizeInMB,
    });
    if (rejections?.length) {
      toast(<Lang id={`- ${rejections.join('\n- ')}`} />, { type: 'error' });
    }
  };

  const AttachmentsCounter = () => (
    <small style={{ fontWeight: 'normal' }}>
      {langTools.langAsString('form_filler.file_uploader_number_of_files')}{' '}
      {minNumberOfAttachments ? `${attachments.length}/${maxNumberOfAttachments}` : attachments.length}.
    </small>
  );

  return (
    <ComponentStructureWrapper node={node}>
      <AttachmentsMappedToFormDataProvider mappingTools={mappingTools}>
        <div
          id={`altinn-fileuploader-${id}`}
          style={{ padding: '0px' }}
        >
          <Label {...{ ...node.item, renderLabelAs: 'plainLabel' }}>
            {shouldShowFileUpload && (
              <>
                <DropzoneComponent
                  id={id}
                  isMobile={mobileView}
                  maxFileSizeInMB={maxFileSizeInMB}
                  readOnly={!!readOnly}
                  onClick={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  hasValidationMessages={hasValidationErrors(componentValidations)}
                  hasCustomFileEndings={hasCustomFileEndings}
                  validFileEndings={validFileEndings}
                  textResourceBindings={textResourceBindings}
                />

                <AttachmentsCounter />
                <ComponentValidations
                  validations={componentValidations}
                  node={node}
                />
                {attachments && attachments.length > 0 && <div className={classes.betweenTableAndDropMargin}></div>}
              </>
            )}

            <FileTable
              node={node}
              mobileView={mobileView}
              attachments={attachments}
              options={options}
            />
          </Label>

          {!shouldShowFileUpload && (
            <>
              <AttachmentsCounter />
              <ComponentValidations
                validations={componentValidations}
                node={node}
              />
              <br />
            </>
          )}
          <AddMoreAttachmentsButton />
        </div>
      </AttachmentsMappedToFormDataProvider>
    </ComponentStructureWrapper>
  );
}

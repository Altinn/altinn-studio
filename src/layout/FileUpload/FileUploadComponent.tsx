import React from 'react';
import { toast } from 'react-toastify';
import type { FileRejection } from 'react-dropzone';

import { getDescriptionId, getLabelId, Label } from 'src/components/label/Label';
import { useAddRejectedAttachments, useAttachmentsFor, useAttachmentsUploader } from 'src/features/attachments/hooks';
import { Lang } from 'src/features/language/Lang';
import { useGetOptions } from 'src/features/options/useGetOptions';
import { useIsSubformPage } from 'src/features/routing/AppRoutingContext';
import { ComponentValidations } from 'src/features/validation/ComponentValidations';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { hasValidationErrors } from 'src/features/validation/utils';
import { useIsMobileOrTablet } from 'src/hooks/useDeviceWidths';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { DropzoneComponent } from 'src/layout/FileUpload/DropZone/DropzoneComponent';
import { FailedAttachments } from 'src/layout/FileUpload/Error/FailedAttachments';
import { InfectedFileAlert } from 'src/layout/FileUpload/Error/InfectedFileAlert';
import classes from 'src/layout/FileUpload/FileUploadComponent.module.css';
import { FileTable } from 'src/layout/FileUpload/FileUploadTable/FileTable';
import { RejectedFileError } from 'src/layout/FileUpload/RejectedFileError';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export type IFileUploadWithTagProps = PropsFromGenericComponent<'FileUpload' | 'FileUploadWithTag'>;

export function FileUploadComponent({ node }: IFileUploadWithTagProps): React.JSX.Element {
  const item = useItemWhenType<'FileUpload' | 'FileUploadWithTag'>(
    node.baseId,
    (t) => t === 'FileUpload' || t === 'FileUploadWithTag',
  );
  const {
    id,
    maxFileSizeInMB,
    readOnly,
    displayMode,
    maxNumberOfAttachments,
    hasCustomFileEndings,
    validFileEndings,
    textResourceBindings,
    dataModelBindings,
  } = item;
  const isSubformPage = useIsSubformPage();
  if (isSubformPage) {
    throw new Error('Cannot use a FileUpload components within a subform');
  }

  const [showFileUpload, setShowFileUpload] = React.useState(false);
  const mobileView = useIsMobileOrTablet();
  const attachments = useAttachmentsFor(node.baseId);
  const addRejectedAttachments = useAddRejectedAttachments();
  const uploadAttachments = useAttachmentsUploader();

  const validations = useUnifiedValidationsForNode(node.baseId).filter(
    (v) => !('attachmentId' in v) || !v.attachmentId,
  );

  const { options, isFetching } = useGetOptions(node.baseId, 'single');

  const canUploadMoreAttachments = attachments.length < maxNumberOfAttachments;
  const isComplexMode = displayMode !== 'simple';
  const isSimpleModeWithNoAttachments = displayMode === 'simple' && attachments.length === 0;

  const shouldShowFileUpload =
    canUploadMoreAttachments && (isComplexMode || isSimpleModeWithNoAttachments || showFileUpload);

  const shouldShowAddButton =
    displayMode === 'simple' &&
    !showFileUpload &&
    attachments.length < maxNumberOfAttachments &&
    attachments.length > 0;

  const handleDrop = (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    const totalAttachments = acceptedFiles.length + rejectedFiles.length + attachments.length;

    if (totalAttachments > maxNumberOfAttachments) {
      // if the user adds more attachments than max, all should be ignored
      toast(
        <Lang
          id='form_filler.file_uploader_validation_error_exceeds_max_files'
          params={[maxNumberOfAttachments]}
        />,
        { type: 'error' },
      );
      return;
    }
    // we should upload all files, if any rejected files we should display an error
    uploadAttachments({ files: acceptedFiles, nodeId: node.id, dataModelBindings });

    if (acceptedFiles.length > 0) {
      setShowFileUpload(displayMode === 'simple' ? false : attachments.length < maxNumberOfAttachments);
    }

    const rejections = rejectedFiles.map((fileRejection) => new RejectedFileError(fileRejection, maxFileSizeInMB));
    if (rejections?.length) {
      addRejectedAttachments(node.id, rejections);
    }
  };

  return (
    <ComponentStructureWrapper node={node}>
      <div
        id={`altinn-fileuploader-${id}`}
        style={{ padding: '0px', width: '100%' }}
      >
        <Label
          baseComponentId={node.baseId}
          renderLabelAs='plainLabel'
        />
        {shouldShowFileUpload && (
          <>
            <DropzoneComponent
              id={id}
              isMobile={mobileView}
              maxFileSizeInMB={maxFileSizeInMB}
              readOnly={!!readOnly}
              onClick={(e) => e.preventDefault()}
              onDrop={handleDrop}
              hasValidationMessages={hasValidationErrors(validations)}
              hasCustomFileEndings={hasCustomFileEndings}
              validFileEndings={validFileEndings}
              labelId={textResourceBindings?.title ? getLabelId(id) : undefined}
              descriptionId={textResourceBindings?.description ? getDescriptionId(id) : undefined}
            />

            <AttachmentsCounter
              numAttachments={attachments.length}
              maxNumAttachments={maxNumberOfAttachments}
            />
            <ComponentValidations
              validations={validations}
              baseComponentId={node.baseId}
            />
            {attachments && attachments.length > 0 && <div className={classes.betweenTableAndDropMargin} />}
          </>
        )}

        <FileTable
          node={node}
          mobileView={mobileView}
          attachments={attachments}
          options={options}
          isFetching={isFetching}
        />

        {!shouldShowFileUpload && (
          <>
            <AttachmentsCounter
              numAttachments={attachments.length}
              maxNumAttachments={maxNumberOfAttachments}
            />
            <ComponentValidations
              validations={validations}
              baseComponentId={node.baseId}
            />
            <br />
          </>
        )}
        {shouldShowAddButton && (
          <button
            className={classes.fileUploadButton}
            onClick={() => setShowFileUpload(true)}
          >
            <Lang id='form_filler.file_uploader_add_attachment' />
          </button>
        )}
        <FailedAttachments node={node} />
        <InfectedFileAlert node={node} />
      </div>
    </ComponentStructureWrapper>
  );
}

function AttachmentsCounter({
  numAttachments,
  maxNumAttachments,
}: {
  numAttachments: number;
  maxNumAttachments: number;
}) {
  return (
    <small style={{ fontWeight: 'normal' }}>
      <Lang
        id='form_filler.file_uploader_number_of_files'
        params={[maxNumAttachments ? `${numAttachments}/${maxNumAttachments}` : numAttachments]}
      />
    </small>
  );
}

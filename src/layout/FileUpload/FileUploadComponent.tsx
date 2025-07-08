import React from 'react';
import { useNavigation } from 'react-router-dom';
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
import { ComponentErrorList } from 'src/layout/GenericComponent';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export function FileUploadComponent({
  baseComponentId,
}: PropsFromGenericComponent<'FileUpload' | 'FileUploadWithTag'>): React.JSX.Element {
  const item = useItemWhenType<'FileUpload' | 'FileUploadWithTag'>(
    baseComponentId,
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

  const [showFileUpload, setShowFileUpload] = React.useState(false);
  const mobileView = useIsMobileOrTablet();
  const attachments = useAttachmentsFor(baseComponentId);
  const addRejectedAttachments = useAddRejectedAttachments();
  const uploadAttachments = useAttachmentsUploader();
  const navigation = useNavigation();

  const validations = useUnifiedValidationsForNode(baseComponentId).filter(
    (v) => !('attachmentId' in v) || !v.attachmentId,
  );

  const { options, isFetching } = useGetOptions(baseComponentId, 'single');
  const indexedId = useIndexedId(baseComponentId);

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
    uploadAttachments({ files: acceptedFiles, nodeId: indexedId, dataModelBindings });

    if (acceptedFiles.length > 0) {
      setShowFileUpload(displayMode === 'simple' ? false : attachments.length < maxNumberOfAttachments);
    }

    const rejections = rejectedFiles.map((fileRejection) => new RejectedFileError(fileRejection, maxFileSizeInMB));
    if (rejections?.length) {
      addRejectedAttachments(indexedId, rejections);
    }
  };

  if (isSubformPage && navigation.state !== 'loading') {
    return (
      <ComponentErrorList
        baseComponentId={baseComponentId}
        errors={['Cannot use a FileUpload components within a subform']}
      />
    );
  }

  return (
    <ComponentStructureWrapper baseComponentId={baseComponentId}>
      <div
        id={`altinn-fileuploader-${id}`}
        style={{ padding: '0px', width: '100%' }}
      >
        <Label
          baseComponentId={baseComponentId}
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
              baseComponentId={baseComponentId}
            />
            {attachments && attachments.length > 0 && <div className={classes.betweenTableAndDropMargin} />}
          </>
        )}

        <FileTable
          baseComponentId={baseComponentId}
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
              baseComponentId={baseComponentId}
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
        <FailedAttachments baseComponentId={baseComponentId} />
        <InfectedFileAlert baseComponentId={baseComponentId} />
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

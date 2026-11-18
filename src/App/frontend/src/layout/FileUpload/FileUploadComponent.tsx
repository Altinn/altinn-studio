import React from 'react';
import { useNavigation } from 'react-router';
import { toast } from 'react-toastify';
import type { FileRejection } from 'react-dropzone';

import { FileUploadLayout, useIsMobileOrTablet } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';

import { Label } from 'src/components/label/Label';
import { AttachmentReadModel } from 'src/features/attachments/hooks/attachmentReadModel';
import { AttachmentUpload } from 'src/features/attachments/hooks/attachmentUpload';
import { Lang } from 'src/features/language/Lang';
import { useGetOptions } from 'src/features/options/useGetOptions';
import { ComponentValidations } from 'src/features/validation/ComponentValidations';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { hasValidationErrors } from 'src/features/validation/utils';
import { useIsSubformPage } from 'src/hooks/navigation';
import { FailedAttachments } from 'src/layout/FileUpload/Error/FailedAttachments';
import { FileTable } from 'src/layout/FileUpload/FileUploadTable/FileTable';
import { RejectedFileError } from 'src/layout/FileUpload/RejectedFileError';
import { ComponentErrorList } from 'src/layout/GenericComponent';
import { useComponentConfig, useDataModelBindingsFor } from 'src/utils/layout/hooks';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useEvalExpression, useEvalOptionalText } from 'src/utils/layout/useEvalExpression';
import type { PropsFromGenericComponent } from 'src/layout';

export function FileUploadComponent({ baseComponentId }: PropsFromGenericComponent<'FileUpload'>): React.JSX.Element {
  const config = useComponentConfig<'FileUpload'>(baseComponentId, 'FileUpload');
  const dataModelBindings = useDataModelBindingsFor(baseComponentId, 'FileUpload');
  const { componentId, innerGrid, validationGrid } = useComponentStructureData(baseComponentId);
  const readOnly = useEvalExpression(config.readOnly, Expressions.FileUpload.readOnly);
  const maxNumberOfAttachments = useEvalExpression(
    config.maxNumberOfAttachments,
    Expressions.FileUpload.maxNumberOfAttachments,
  );
  const description = useEvalOptionalText(
    config.textResourceBindings?.description,
    Expressions.FileUpload.textResourceBindings.description,
  );
  const title = useEvalOptionalText(
    config.textResourceBindings?.title,
    Expressions.FileUpload.textResourceBindings.title,
  );

  const isSubformPage = useIsSubformPage();

  const [showFileUpload, setShowFileUpload] = React.useState(false);
  const mobileView = useIsMobileOrTablet();
  const attachments = AttachmentReadModel.useAttachmentsFor(baseComponentId);
  const addRejectedAttachments = AttachmentUpload.useAddRejectedAttachments();
  const uploadAttachments = AttachmentUpload.useAttachmentsUploader();
  const navigation = useNavigation();

  const validations = useUnifiedValidationsForNode(baseComponentId).filter(
    (v) => !('attachmentId' in v) || !v.attachmentId,
  );
  const { options, isFetching } = useGetOptions(baseComponentId, 'single');

  const handleDrop = (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    if (readOnly) {
      return;
    }

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
    uploadAttachments({ files: acceptedFiles, nodeId: componentId, dataModelBindings });

    if (acceptedFiles.length > 0) {
      setShowFileUpload(config.displayMode === 'simple' ? false : attachments.length < maxNumberOfAttachments);
    }

    const rejections = rejectedFiles.map(
      (fileRejection) => new RejectedFileError(fileRejection, config.maxFileSizeInMB),
    );
    if (rejections?.length) {
      addRejectedAttachments(componentId, rejections);
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
    <FileUploadLayout
      componentId={componentId}
      title={title}
      description={description}
      readOnly={readOnly}
      label={
        <Label
          baseComponentId={baseComponentId}
          renderLabelAs='plainLabel'
        />
      }
      displayMode={config.displayMode}
      maxFileSizeInMB={config.maxFileSizeInMB}
      maxNumberOfAttachments={maxNumberOfAttachments}
      hasCustomFileEndings={config.hasCustomFileEndings}
      validFileEndings={config.validFileEndings}
      numberOfAttachments={attachments.length}
      dropzoneOpen={showFileUpload}
      onAddClick={() => setShowFileUpload(true)}
      onDrop={handleDrop}
      hasValidationErrors={hasValidationErrors(validations)}
      innerGrid={innerGrid}
      validationGrid={validationGrid}
      validationMessages={
        <ComponentValidations
          validations={validations}
          baseComponentId={baseComponentId}
        />
      }
      fileList={
        <FileTable
          baseComponentId={baseComponentId}
          mobileView={mobileView}
          attachments={attachments}
          options={options}
          isFetching={isFetching}
        />
      }
      failedAttachments={<FailedAttachments baseComponentId={baseComponentId} />}
    />
  );
}

import type { ReactNode } from 'react';
import type { FileRejection } from 'react-dropzone';

import { Dropzone, mapExtensionToAcceptMime } from '@app/form-component/app-components/Dropzone';
import { useIsMobileOrTablet } from '@app/form-component/app-components/hooks';
import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { ComponentStructure } from '@app/form-component/layout-components/common/ComponentStructure';
import { LabelContent } from '@app/form-component/layout-components/common/LabelContent';
import { getDescriptionId, getLabelId } from '@app/form-component/layout-components/utils/labelIds';
import { Label, Paragraph } from '@digdir/designsystemet-react';
import { CloudUpIcon } from '@navikt/aksel-icons';
import type { IGridStyling } from '@app/form-component/app-components/Flex';

import classes from './FileUploadLayout.module.css';

export type FileUploadDisplayMode = 'simple' | 'list';

export interface FileUploadLayoutProps {
  componentId: string;
  /** Text-resource key for the label text. When undefined, no label is rendered. */
  title?: string;
  /** Text-resource key for the label description. */
  description?: string;
  /** Text-resource key for the label help text. */
  help?: string;
  required?: boolean;
  readOnly?: boolean;
  showOptionalMarking?: boolean;
  /**
   * Replaces the label built from `title`, `description`, `help`, `required` and `showOptionalMarking`.
   * The runtime passes its own label, which follows the overrides it gets from its parent component.
   */
  label?: ReactNode;
  /** `simple` hides the drop zone once a file is uploaded, behind an "add more" button. Defaults to `list`. */
  displayMode?: FileUploadDisplayMode;
  maxFileSizeInMB: number;
  maxNumberOfAttachments: number;
  /** Whether only the file endings in `validFileEndings` are accepted. */
  hasCustomFileEndings?: boolean;
  /** The accepted file endings, as a comma-separated string or a list, such as `.pdf,.png`. */
  validFileEndings?: string | string[];
  /** How many files are attached now. */
  numberOfAttachments: number;
  /** Whether the user has asked for the drop zone again in `simple` mode. */
  dropzoneOpen?: boolean;
  /** Called when the user clicks "add more attachments" in `simple` mode. */
  onAddClick?: () => void;
  onDrop: (acceptedFiles: File[], rejectedFiles: FileRejection[]) => void;
  hasValidationErrors?: boolean;
  /** The list of attached files. The runtime renders it; it is placed below the drop zone. */
  fileList?: ReactNode;
  /** Errors for files that could not be uploaded, shown last. */
  failedAttachments?: ReactNode;
  /** The component's validation messages, shown under the attachment counter. */
  validationMessages?: ReactNode;
  innerGrid?: IGridStyling;
  validationGrid?: IGridStyling;
}

export function FileUploadLayout({
  componentId,
  title,
  description,
  help,
  required,
  readOnly,
  showOptionalMarking,
  label,
  displayMode,
  maxFileSizeInMB,
  maxNumberOfAttachments,
  hasCustomFileEndings,
  validFileEndings,
  numberOfAttachments,
  dropzoneOpen,
  onAddClick,
  onDrop,
  hasValidationErrors,
  fileList,
  failedAttachments,
  validationMessages,
  innerGrid,
  validationGrid,
}: FileUploadLayoutProps) {
  const { lang, langAsString } = useTranslation();
  const mobileView = useIsMobileOrTablet();

  const isSimpleMode = displayMode === 'simple';
  const canUploadMoreAttachments = numberOfAttachments < maxNumberOfAttachments;
  const showDropzone =
    !readOnly &&
    canUploadMoreAttachments &&
    (!isSimpleMode || numberOfAttachments === 0 || !!dropzoneOpen);
  const showAddButton =
    !readOnly &&
    isSimpleMode &&
    !dropzoneOpen &&
    canUploadMoreAttachments &&
    numberOfAttachments > 0;

  const filesToAccept =
    hasCustomFileEndings && validFileEndings !== undefined
      ? mapExtensionToAcceptMime(validFileEndings)
      : undefined;

  const dragLabelId = `file-upload-drag-${componentId}`;
  const formatLabelId = `file-upload-format-${componentId}`;
  const descriptionId = description ? getDescriptionId(componentId) : undefined;
  const ariaDescribedBy = [descriptionId, dragLabelId, formatLabelId].filter(Boolean).join(' ');

  const counter = (
    <small style={{ fontWeight: 'normal' }}>
      {lang('form_filler.file_uploader_number_of_files', [
        !readOnly && maxNumberOfAttachments
          ? `${numberOfAttachments}/${maxNumberOfAttachments}`
          : numberOfAttachments,
      ])}
    </small>
  );

  return (
    <ComponentStructure
      componentId={componentId}
      innerGrid={innerGrid}
      validationGrid={validationGrid}
    >
      <div id={`altinn-fileuploader-${componentId}`} style={{ padding: '0px', width: '100%' }}>
        {label !== undefined
          ? label
          : title && (
              <Label id={getLabelId(componentId)} htmlFor={componentId} style={{ width: '100%' }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <LabelContent
                    componentId={componentId}
                    label={title}
                    description={description}
                    help={help}
                    required={required}
                    readOnly={readOnly}
                    showOptionalMarking={showOptionalMarking}
                  />
                </div>
              </Label>
            )}
        {readOnly && (
          <Paragraph data-size='sm'>{lang('form_filler.file_uploader_read_only')}</Paragraph>
        )}
        {showDropzone && (
          <>
            <Dropzone
              id={componentId}
              maxFileSize={{
                sizeInMB: maxFileSizeInMB,
                text: langAsString('form_filler.file_uploader_max_size_mb', [maxFileSizeInMB]),
              }}
              readOnly={!!readOnly}
              onClick={(e) => e.preventDefault()}
              onDrop={onDrop}
              hasValidationMessages={!!hasValidationErrors}
              acceptedFiles={filesToAccept}
              labelId={title ? getLabelId(componentId) : undefined}
              describedBy={ariaDescribedBy}
            >
              <div className={classes.fileUploadWrapper}>
                <CloudUpIcon className={classes.uploadIcon} aria-hidden />
                <b id={dragLabelId}>
                  {mobileView ? (
                    <span className={classes.blueUnderLine}>
                      {lang('form_filler.file_uploader_upload')}
                    </span>
                  ) : (
                    <>
                      {lang('form_filler.file_uploader_drag')}
                      <span className={classes.blueUnderLine}>
                        {' '}
                        {lang('form_filler.file_uploader_find')}
                      </span>
                    </>
                  )}
                </b>
                <span id={formatLabelId}>
                  {lang('form_filler.file_uploader_valid_file_format')}
                  {hasCustomFileEndings
                    ? ` ${validFileEndings}`
                    : ` ${langAsString('form_filler.file_upload_valid_file_format_all')}`}
                </span>
              </div>
            </Dropzone>
            {counter}
            {validationMessages}
            {numberOfAttachments > 0 && <div className={classes.betweenTableAndDropMargin} />}
          </>
        )}

        {fileList}

        {!showDropzone && (
          <>
            {counter}
            {validationMessages}
            <br />
          </>
        )}
        {showAddButton && (
          <button className={classes.fileUploadButton} onClick={onAddClick}>
            {lang('form_filler.file_uploader_add_attachment')}
          </button>
        )}
        {failedAttachments}
      </div>
    </ComponentStructure>
  );
}

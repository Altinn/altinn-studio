import React, { useState } from 'react';

import { EXPERIMENTAL_Suggestion as Suggestion } from '@digdir/designsystemet-react';
import deepEqual from 'fast-deep-equal';
import type { SuggestionItem } from '@digdir/designsystemet-react';

import { Button } from 'src/app-components/Button/Button';
import { Flex } from 'src/app-components/Flex/Flex';
import { AltinnLoader } from 'src/components/AltinnLoader';
import { isAttachmentUploaded } from 'src/features/attachments';
import { useAttachmentsUpdater } from 'src/features/attachments/hooks';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useOnAttachmentSave } from 'src/features/validation/callbacks/onAttachmentSave';
import { ComponentValidations } from 'src/features/validation/ComponentValidations';
import { useAttachmentValidations } from 'src/features/validation/selectors/attachmentValidations';
import { hasValidationErrors } from 'src/features/validation/utils';
import { AttachmentFileName } from 'src/layout/FileUpload/FileUploadTable/AttachmentFileName';
import { FileTableButtons } from 'src/layout/FileUpload/FileUploadTable/FileTableButtons';
import { useFileTableRow } from 'src/layout/FileUpload/FileUploadTable/FileTableRowContext';
import classes from 'src/layout/FileUploadWithTag/EditWindowComponent.module.css';
import comboboxClasses from 'src/styles/combobox.module.css';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import { optionFilter } from 'src/utils/options';
import type { IAttachment } from 'src/features/attachments';
import type { IOptionInternal } from 'src/features/options/castOptionsToStrings';

export interface EditWindowProps {
  baseComponentId: string;
  attachment: IAttachment;
  mobileView: boolean;
  options?: IOptionInternal[];
  isFetching: boolean;
}

export function EditWindowComponent({
  attachment,
  mobileView,
  baseComponentId,
  options,
  isFetching,
}: EditWindowProps): React.JSX.Element {
  const { textResourceBindings } = useItemWhenType(baseComponentId, 'FileUploadWithTag');
  const { langAsString } = useLanguage();
  const { setEditIndex } = useFileTableRow();
  const uploadedAttachment = isAttachmentUploaded(attachment) ? attachment : undefined;
  const rawSelectedTags = uploadedAttachment?.data.tags?.filter((tag) => options?.find((o) => o.value === tag)) ?? [];
  const [chosenTags, setChosenTags] = useState<string[]>(rawSelectedTags);
  const chosenTagsLabels = chosenTags.map((tag) => langAsString(options?.find((o) => o.value === tag)?.label ?? ''));
  const nodeId = useIndexedId(baseComponentId);
  const updateAttachment = useAttachmentsUpdater();

  const attachmentValidations = useAttachmentValidations(baseComponentId, uploadedAttachment?.data.id);
  const onAttachmentSave = useOnAttachmentSave();

  const hasErrors = hasValidationErrors(attachmentValidations);

  const formatSelectedValue = (tags: string[]): string | SuggestionItem | undefined => {
    const tag = tags[0];
    if (!tag) {
      return undefined;
    }
    const option = options?.find((o) => o.value === tag);
    return option ? { value: option.value, label: langAsString(option.label) } : tag;
  };

  const handleSave = async () => {
    if (!uploadedAttachment) {
      return;
    }

    const { tags: _tags } = uploadedAttachment.data;
    const existingTags = _tags || [];

    if (!deepEqual(chosenTags, existingTags)) {
      await setAttachmentTag(chosenTags);
    }
    setEditIndex(-1);
    await onAttachmentSave(baseComponentId, uploadedAttachment.data.id);
  };

  const setAttachmentTag = async (tags: string[]) => {
    if (!isAttachmentUploaded(attachment)) {
      return;
    }

    await updateAttachment({ attachment, nodeId, tags });
  };

  const isLoading = attachment.updating || !attachment.uploaded || isFetching || options?.length === 0;
  const uniqueId = isAttachmentUploaded(attachment) ? attachment.data.id : attachment.data.temporaryId;

  return (
    <div
      id={`attachment-edit-window-${uniqueId}`}
      className={classes.editContainer}
    >
      <Flex
        justifyContent='space-between'
        container
        direction='row'
        style={{ flexWrap: 'nowrap' }}
      >
        <Flex
          className={classes.textContainer}
          style={{ flexShrink: 1 }}
        >
          <AttachmentFileName
            attachment={attachment}
            mobileView={mobileView}
          />
        </Flex>
        <Flex
          className={classes.textContainer}
          style={{ flexShrink: 0 }}
        >
          <div className={classes.iconButtonWrapper}>
            {attachment.uploaded && (
              <div
                style={{ marginLeft: '0.9375rem', marginRight: '0.9375rem' }}
                data-testid='status-success'
              >
                {!mobileView ? <Lang id='form_filler.file_uploader_list_status_done' /> : undefined}
              </div>
            )}
            {!attachment.uploaded && (
              <AltinnLoader
                id={`attachment-loader-upload-${uniqueId}`}
                style={{
                  width: '80px',
                }}
                srContent={langAsString('general.loading')}
              />
            )}
            <div>
              <FileTableButtons
                baseComponentId={baseComponentId}
                mobileView={mobileView}
                attachment={attachment}
                editWindowIsOpen={true}
              />
            </div>
          </div>
        </Flex>
      </Flex>
      <Flex
        container
        direction='column'
        className={classes.gap}
      >
        {textResourceBindings?.tagTitle && (
          <label
            className={classes.label}
            htmlFor={`attachment-tag-dropdown-${uniqueId}`}
          >
            <Lang id={textResourceBindings?.tagTitle} />
          </label>
        )}
        {isLoading ? (
          <AltinnLoader
            id={`attachment-loader-update-${uniqueId}`}
            srContent={langAsString('general.loading')}
            style={{
              height: '30px',
              padding: '7px 34px 5px 28px',
            }}
          />
        ) : (
          <Flex
            container
            direction='row'
            className={classes.gap}
          >
            <Flex
              item
              style={{ minWidth: '150px', flexGrow: 1, maxWidth: '100%', flexBasis: 0 }}
            >
              <Suggestion
                multiple={false}
                filter={(elm) => optionFilter(elm, chosenTagsLabels)}
                data-size='sm'
                selected={formatSelectedValue(chosenTags)}
                className={comboboxClasses.container}
                style={{ width: '100%' }}
              >
                <Suggestion.Input
                  id={`attachment-tag-dropdown-${uniqueId}`}
                  aria-invalid={hasErrors}
                  aria-label={langAsString('general.choose')}
                />
                <Suggestion.List>
                  <Suggestion.Empty>
                    <Lang id='form_filler.no_options_found' />
                  </Suggestion.Empty>
                  {options?.map((option) => (
                    <Suggestion.Option
                      key={option.value}
                      value={option.value}
                      label={langAsString(option.label) || '\u200b'}
                      onClick={(_) => setChosenTags(option?.value ? [option?.value] : [])}
                    >
                      <span>
                        <wbr />
                        <Lang id={option.label} />
                        {option.description && (
                          <>
                            <br />
                            <Lang id={option.description} />
                          </>
                        )}
                      </span>
                    </Suggestion.Option>
                  ))}
                </Suggestion.List>
              </Suggestion>
            </Flex>
            <Flex
              item
              size={{ xs: 'auto' }}
            >
              {attachment.updating ? (
                <AltinnLoader
                  id={`attachment-loader-update-${uniqueId}`}
                  srContent={langAsString('general.loading')}
                  style={{
                    height: '30px',
                    padding: '7px 34px 5px 28px',
                  }}
                />
              ) : (
                <Button
                  onClick={handleSave}
                  id={`attachment-save-tag-button-${uniqueId}`}
                >
                  <Lang id='general.save' />
                </Button>
              )}
            </Flex>
          </Flex>
        )}
      </Flex>
      {hasErrors ? (
        <div
          style={{
            whiteSpace: 'pre-wrap',
          }}
        >
          <ComponentValidations
            validations={attachmentValidations}
            baseComponentId={baseComponentId}
          />
        </div>
      ) : undefined}
    </div>
  );
}

import React, { useState } from 'react';

import { Button, Combobox } from '@digdir/designsystemet-react';
import { Grid } from '@material-ui/core';
import { CheckmarkCircleFillIcon } from '@navikt/aksel-icons';
import deepEqual from 'fast-deep-equal';

import { AltinnLoader } from 'src/components/AltinnLoader';
import { isAttachmentUploaded } from 'src/features/attachments';
import { useAttachmentsUpdater } from 'src/features/attachments/AttachmentsContext';
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
import type { IAttachment } from 'src/features/attachments';
import type { IOptionInternal } from 'src/features/options/castOptionsToStrings';
import type { PropsFromGenericComponent } from 'src/layout';

export interface EditWindowProps {
  node: PropsFromGenericComponent<'FileUploadWithTag'>['node'];
  attachment: IAttachment;
  mobileView: boolean;
  options?: IOptionInternal[];
}

export function EditWindowComponent({ attachment, mobileView, node, options }: EditWindowProps): React.JSX.Element {
  const { textResourceBindings, readOnly } = node.item;
  const { langAsString } = useLanguage();
  const { setEditIndex } = useFileTableRow();
  const uploadedAttachment = isAttachmentUploaded(attachment) ? attachment : undefined;
  const rawSelectedTags = uploadedAttachment?.data.tags?.filter((tag) => options?.find((o) => o.value === tag)) ?? [];
  const [chosenTags, setChosenTags] = useState<string[]>(rawSelectedTags);
  const updateAttachment = useAttachmentsUpdater();

  const attachmentValidations = useAttachmentValidations(node, uploadedAttachment?.data.id);
  const onAttachmentSave = useOnAttachmentSave();

  const hasErrors = hasValidationErrors(attachmentValidations);

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
    onAttachmentSave(node, uploadedAttachment.data.id);
  };

  const setAttachmentTag = async (tags: string[]) => {
    if (!isAttachmentUploaded(attachment)) {
      return;
    }

    await updateAttachment({
      attachment,
      node,
      tags,
    });
  };

  const saveIsDisabled = attachment.updating || !attachment.uploaded || readOnly;
  const uniqueId = isAttachmentUploaded(attachment) ? attachment.data.id : attachment.data.temporaryId;

  return (
    <div
      id={`attachment-edit-window-${uniqueId}`}
      className={classes.editContainer}
    >
      <Grid
        justifyContent='space-between'
        container={true}
        spacing={0}
        direction='row'
        style={{ flexWrap: 'nowrap' }}
      >
        <Grid
          className={classes.textContainer}
          style={{ flexShrink: 1 }}
        >
          <AttachmentFileName
            attachment={attachment}
            mobileView={mobileView}
          />
        </Grid>
        <Grid
          className={classes.textContainer}
          style={{ flexShrink: 0 }}
        >
          <div className={classes.iconButtonWrapper}>
            {attachment.uploaded && (
              <div style={{ marginLeft: '0.9375rem', marginRight: '0.9375rem' }}>
                {!mobileView ? <Lang id='form_filler.file_uploader_list_status_done' /> : undefined}
                <CheckmarkCircleFillIcon
                  role='img'
                  aria-hidden={!mobileView}
                  aria-label={langAsString('form_filler.file_uploader_list_status_done')}
                  className={classes.checkMark}
                  data-testid='checkmark-success'
                />
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
                node={node}
                mobileView={mobileView}
                attachment={attachment}
                editWindowIsOpen={true}
              />
            </div>
          </div>
        </Grid>
      </Grid>
      <Grid
        container
        direction='column'
        className={classes.gap}
      >
        {textResourceBindings?.tagTitle && (
          // eslint-disable-next-line jsx-a11y/label-has-associated-control
          <label
            className={classes.label}
            htmlFor={`attachment-tag-dropdown-${uniqueId}`}
          >
            <Lang id={textResourceBindings?.tagTitle} />
          </label>
        )}
        <Grid
          container
          direction='row'
          wrap='wrap'
          className={classes.gap}
        >
          <Grid
            item={true}
            style={{ minWidth: '150px' }}
            xs
          >
            <Combobox
              id={`attachment-tag-dropdown-${uniqueId}`}
              size='sm'
              hideLabel={true}
              label={langAsString('general.choose')}
              value={chosenTags}
              disabled={saveIsDisabled}
              onValueChange={setChosenTags}
              error={hasErrors}
              className={comboboxClasses.container}
            >
              <Combobox.Empty>
                <Lang id={'form_filler.no_options_found'} />
              </Combobox.Empty>
              {options?.map((option) => (
                <Combobox.Option
                  key={option.value}
                  value={option.value}
                  description={langAsString(option.description)}
                  displayValue={langAsString(option.label)}
                >
                  <Lang
                    id={option.label}
                    node={node}
                  />
                </Combobox.Option>
              ))}
            </Combobox>
          </Grid>
          <Grid
            item={true}
            xs='auto'
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
                size='small'
                onClick={handleSave}
                id={`attachment-save-tag-button-${uniqueId}`}
                disabled={saveIsDisabled}
              >
                <Lang id={'general.save'} />
              </Button>
            )}
          </Grid>
        </Grid>
      </Grid>
      {hasErrors ? (
        <div
          style={{
            whiteSpace: 'pre-wrap',
          }}
        >
          <ComponentValidations
            validations={attachmentValidations}
            node={node}
          />
        </div>
      ) : undefined}
    </div>
  );
}

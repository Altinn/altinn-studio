import React, { useState } from 'react';

import { LegacySelect } from '@digdir/design-system-react';
import { Button } from '@digdir/designsystemet-react';
import { Grid } from '@material-ui/core';
import { CheckmarkCircleFillIcon } from '@navikt/aksel-icons';

import { AltinnLoader } from 'src/components/AltinnLoader';
import { isAttachmentUploaded } from 'src/features/attachments';
import { useAttachmentsUpdater } from 'src/features/attachments/AttachmentsContext';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useOnAttachmentSave } from 'src/features/validation/callbacks/onAttachmentSave';
import { ComponentValidations } from 'src/features/validation/ComponentValidations';
import { useAttachmentValidations } from 'src/features/validation/selectors/attachmentValidations';
import { hasValidationErrors } from 'src/features/validation/utils';
import { useFormattedOptions } from 'src/hooks/useFormattedOptions';
import { AttachmentFileName } from 'src/layout/FileUpload/FileUploadTable/AttachmentFileName';
import { FileTableButtons } from 'src/layout/FileUpload/FileUploadTable/FileTableButtons';
import { useFileTableRow } from 'src/layout/FileUpload/FileUploadTable/FileTableRowContext';
import classes from 'src/layout/FileUploadWithTag/EditWindowComponent.module.css';
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
  const rawSelectedTag = uploadedAttachment?.data.tags ? uploadedAttachment.data.tags[0] : undefined;
  const [chosenOption, setChosenOption] = useState<IOptionInternal | undefined>(
    rawSelectedTag ? options?.find((o) => o.value === rawSelectedTag) : undefined,
  );
  const formattedOptions = useFormattedOptions(options);
  const updateAttachment = useAttachmentsUpdater();

  const attachmentValidations = useAttachmentValidations(node, uploadedAttachment?.data.id);
  const onAttachmentSave = useOnAttachmentSave();

  const hasErrors = hasValidationErrors(attachmentValidations);

  const onDropdownDataChange = (value: string) => {
    if (value !== undefined) {
      const option = options?.find((o) => o.value === value);
      if (option !== undefined) {
        setChosenOption(option);
      } else {
        console.error(`Could not find option for ${value}`);
      }
    }
  };

  const handleSave = async () => {
    if (!uploadedAttachment) {
      return;
    }

    const { tags: _tags } = uploadedAttachment.data;
    const existingTags = _tags || [];

    if (chosenOption?.value !== existingTags[0]) {
      await setAttachmentTag(chosenOption);
    }
    setEditIndex(-1);
    onAttachmentSave(node, uploadedAttachment.data.id);
  };

  const setAttachmentTag = async (option?: IOptionInternal) => {
    if (!isAttachmentUploaded(attachment)) {
      return;
    }

    await updateAttachment({
      attachment,
      node,
      tags: option?.value ? [option.value] : [],
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
            <LegacySelect
              inputId={`attachment-tag-dropdown-${uniqueId}`}
              onChange={onDropdownDataChange}
              options={formattedOptions}
              disabled={saveIsDisabled}
              error={hasErrors}
              label={langAsString('general.choose')}
              hideLabel={true}
              value={chosenOption?.value}
            />
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
                onClick={() => handleSave()}
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

import React from 'react';

import { Button, ButtonColor, ButtonVariant } from '@digdir/design-system-react';
import { Grid, makeStyles } from '@material-ui/core';
import { CheckmarkCircleFillIcon, TrashIcon } from '@navikt/aksel-icons';
import classNames from 'classnames';

import { useAppDispatch } from 'src/common/hooks/useAppDispatch';
import { AltinnLoader } from 'src/components/AltinnLoader';
import { getLanguageFromKey } from 'src/language/sharedLanguage';
import { FileName } from 'src/layout/FileUpload/shared/render';
import css from 'src/layout/FileUploadWithTag/EditWindowComponent.module.css';
import { AttachmentActions } from 'src/shared/resources/attachments/attachmentSlice';
import { AltinnAppTheme } from 'src/theme/altinnAppTheme';
import { renderValidationMessages } from 'src/utils/render';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IAttachment } from 'src/shared/resources/attachments';
import type { IOption } from 'src/types';

const useStyles = makeStyles({
  textContainer: {
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    color: '#000',
    fontWeight: '500 !important' as any,
    fontSize: '0.875rem',
    minWidth: '0px',
  },
  editContainer: {
    display: 'inline-block',
    border: `2px dotted ${AltinnAppTheme.altinnPalette.primary.blueMedium}`,
    padding: '12px',
    width: '100%',
    marginTop: '12px',
    marginBottom: '12px',
  },
  select: {
    fontSize: '1rem',
    '&:focus': {
      outline: `2px solid ${AltinnAppTheme.altinnPalette.primary.blueDark}`,
    },
  },
});

export interface EditWindowProps extends PropsFromGenericComponent<'FileUploadWithTag'> {
  attachment: IAttachment;
  mobileView: boolean;
  options?: IOption[];
  onSave: (attachment: IAttachment) => void;
  onDropdownDataChange: (id: string, value: string) => void;
  setEditIndex: (index: number) => void;
  attachmentValidations: {
    id: string;
    message: string;
  }[];
}

export function EditWindowComponent(props: EditWindowProps): JSX.Element {
  const dispatch = useAppDispatch();
  const classes = useStyles();
  const { id, baseComponentId, dataModelBindings, readOnly, textResourceBindings } = props.node.item;

  const handleDeleteFile = () => {
    dispatch(
      AttachmentActions.deleteAttachment({
        attachment: props.attachment,
        componentId: id,
        attachmentType: baseComponentId || id,
        dataModelBindings: dataModelBindings,
      }),
    );
    props.setEditIndex(-1);
  };

  const saveIsDisabled = props.attachment.updating === true || props.attachment.uploaded === false || readOnly;

  return (
    <div
      id={`attachment-edit-window-${props.attachment.id}`}
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
          <FileName>{props.attachment.name}</FileName>
        </Grid>
        <Grid
          className={classes.textContainer}
          style={{ flexShrink: 0 }}
        >
          <div className={css.iconButtonWrapper}>
            {props.attachment.uploaded && (
              <div style={{ marginLeft: '0.9375rem', marginRight: '0.9375rem' }}>
                {!props.mobileView
                  ? getLanguageFromKey('form_filler.file_uploader_list_status_done', props.language)
                  : undefined}
                <CheckmarkCircleFillIcon
                  role='img'
                  aria-hidden={!props.mobileView}
                  aria-label={getLanguageFromKey('form_filler.file_uploader_list_status_done', props.language)}
                  className={css.checkMark}
                />
              </div>
            )}
            {!props.attachment.uploaded && (
              <AltinnLoader
                id={`attachment-loader-upload-${props.attachment.id}`}
                style={{
                  width: '80px',
                }}
                srContent={getLanguageFromKey('general.loading', props.language)}
              />
            )}
            <div>
              <Button
                onClick={() => handleDeleteFile()}
                variant={ButtonVariant.Quiet}
                color={ButtonColor.Danger}
                icon={<TrashIcon aria-hidden={true} />}
                iconPlacement='right'
              >
                {getLanguageFromKey('general.delete', props.language)}
              </Button>
            </div>
          </div>
        </Grid>
      </Grid>
      <Grid>
        {textResourceBindings?.tagTitle && <h6>{props.getTextResource(textResourceBindings?.tagTitle)}</h6>}
        <Grid
          container={true}
          spacing={1}
        >
          <Grid
            item={true}
            xs
          >
            <select
              id={`attachment-tag-dropdown-${props.attachment.id}`}
              tabIndex={0}
              defaultValue={props.attachment.tags && props.attachment.tags[0]}
              disabled={saveIsDisabled}
              className={classNames(classes.select, 'custom-select a-custom-select', {
                'validation-error': props.attachmentValidations.filter((i) => i.id === props.attachment.id).length > 0,
                'disabled !important': props.attachment.updating || readOnly,
              })}
              onChange={(e) => props.onDropdownDataChange(props.attachment.id, e.target.value)}
              onBlur={(e) => props.onDropdownDataChange(props.attachment.id, e.target.value)}
            >
              <option style={{ display: 'none' }} />
              {props.options?.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {props.getTextResourceAsString(option.label)}
                </option>
              ))}
            </select>
          </Grid>
          <Grid
            item={true}
            xs='auto'
          >
            {props.attachment.updating ? (
              <AltinnLoader
                id={`attachment-loader-update-${props.attachment.id}`}
                srContent={getLanguageFromKey('general.loading', props.language)}
                style={{
                  height: '30px',
                  padding: '7px 34px 5px 28px',
                }}
              />
            ) : (
              <Button
                onClick={() => props.onSave(props.attachment)}
                id={`attachment-save-tag-button-${props.attachment.id}`}
                disabled={saveIsDisabled}
              >
                {getLanguageFromKey('general.save', props.language)}
              </Button>
            )}
          </Grid>
        </Grid>
      </Grid>
      {props.attachmentValidations.filter((i) => i.id === props.attachment.id).length > 0 ? (
        <div
          style={{
            whiteSpace: 'pre-wrap',
          }}
        >
          {renderValidationMessages(
            props.attachmentValidations
              .filter((i) => i.id === props.attachment.id)
              .map((e) => {
                return e.message;
              }),
            `attachment-error-${props.attachment.id}`,
            'error',
          )}
        </div>
      ) : undefined}
    </div>
  );
}

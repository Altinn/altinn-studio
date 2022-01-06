import * as React from 'react';
import { AltinnAppTheme } from 'altinn-shared/theme';
import { Grid, IconButton, makeStyles } from '@material-ui/core';
import { AltinnButton, AltinnLoader } from 'altinn-shared/components';
import { IAttachment } from '../../../../shared/resources/attachments';
import { ILanguage } from 'altinn-shared/types';
import { IOption } from 'src/types';
import { getLanguageFromKey } from 'altinn-shared/utils';
import AttachmentDispatcher from 'src/shared/resources/attachments/attachmentActions';
import { renderValidationMessages } from 'src/utils/render';
import { renderFileName } from '../shared/render';
import classNames from 'classnames';

const useStyles = makeStyles({
  textContainer: {
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    color: '#000',
    fontWeight: '500 !important' as any,
    fontSize: '1.4rem',
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
  deleteButton: {
    padding: '0px',
    color: 'black',
    justifyContent: 'left',
  },
  select: {
    fontSize: '1.6rem',
    '&:focus': {
      outline: `2px solid ${AltinnAppTheme.altinnPalette.primary.blueDark}`,
    },
  },
});

export interface EditWindowProps{
  id: string;
  attachment: IAttachment;
  language: ILanguage;
  mobileView: boolean;
  readOnly: boolean;
  options: IOption[];
  getTextResource: (key: string) => string;
  getTextResourceAsString: (key: string) => string;
  onClickSave: (attachment: IAttachment) => void;
  onDropdownDataChange: (id: string, value: string) => void;
  setEditIndex: (index: number) => void;
  textResourceBindings: any;
  attachmentValidations: {
    id: string;
    message: string;
  }[];
}

export function EditWindowComponent(props: EditWindowProps): JSX.Element {
  const classes = useStyles();

  const handleDeleteFile = () => {
    AttachmentDispatcher.deleteAttachment(props.attachment, props.id, props.id);
    props.setEditIndex(-1);
  };

  const tagSaveIsDisabled = (attachment: IAttachment): boolean => {
    return (attachment.uploaded === false || attachment.updating === true);
  };

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
          {renderFileName(props.attachment.name)}
        </Grid>
        <Grid
          className={classes.textContainer}
          style={{ flexShrink: 0 }}
        >
          <div style={{ display: 'flex' }}>
            {props.attachment.uploaded &&
              <div style={{ marginLeft: '1.5rem', marginRight: '1.5rem' }}>
                {!props.mobileView ? getLanguageFromKey('form_filler.file_uploader_list_status_done', props.language) : undefined}
                <i
                  className='ai ai-check-circle'
                  aria-label={getLanguageFromKey('form_filler.file_uploader_list_status_done', props.language)}
                />
              </div>
            }
            {!props.attachment.uploaded &&
              <AltinnLoader
                id={`attachment-loader-upload-${props.attachment.id}`}
                style={{
                  width: '80px',
                }}
                srContent={getLanguageFromKey('general.loading', props.language)}
              />
            }
            <div>
              <IconButton
                classes={{ root: classes.deleteButton }}
                onClick={() => handleDeleteFile()}
                tabIndex={0}
              >
                {getLanguageFromKey('general.delete', props.language)}<i className='ai ai-trash' />
              </IconButton>
            </div>
          </div>
        </Grid>
      </Grid>
      <Grid>
        <h6>{props.getTextResource(props.textResourceBindings.tagTitle)}</h6>
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
              defaultValue={props.attachment.tags !== undefined ? props.attachment.tags[0] : null}
              disabled={props.attachment.updating ? true : props.readOnly}
              className={classNames(classes.select, 'custom-select a-custom-select', { 'validation-error': props.attachmentValidations.filter((i) => i.id === props.attachment.id).length > 0, 'disabled !important': props.attachment.updating ? true : props.readOnly })}
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
            {props.attachment.updating ?
              <AltinnLoader
                id={`attachment-loader-update-${props.attachment.id}`}
                srContent={getLanguageFromKey('general.loading', props.language)}
                style={{
                  height: '30px',
                  padding: '7px 34px 5px 28px',
                }}
              />
              :
              <div
                style={{
                  marginTop: '-6px', // Adjust to be in line with dropdown
                }}
              >
                <AltinnButton
                  btnText={getLanguageFromKey('general.save', props.language)}
                  onClickFunction={() => props.onClickSave(props.attachment)}
                  id={`attachment-save-tag-button-${props.attachment.id}`}
                  disabled={tagSaveIsDisabled(props.attachment) ? true : props.readOnly}
                />
              </div>
            }
          </Grid>
        </Grid>
      </Grid>
      {props.attachmentValidations.filter((i) => i.id === props.attachment.id).length > 0 ?
        <div
          style={{
            whiteSpace: 'pre-wrap',
          }}
        >
          {renderValidationMessages(props.attachmentValidations.filter((i) => i.id === props.attachment.id).map((e) => { return e.message; }), `attachment-error-${props.attachment.id}`, 'error')}
        </div>
        : undefined
      }
    </div>
  );
};

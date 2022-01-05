import * as React from 'react';
import { AltinnAppTheme } from 'altinn-shared/theme';
import { Grid, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, IconButton, makeStyles } from '@material-ui/core';
import { AltinnLoader } from 'altinn-shared/components';
import { IAttachment } from '../../../../shared/resources/attachments';
import { ILanguage } from 'altinn-shared/types';
import { IOption } from 'src/types';
import { getLanguageFromKey } from 'altinn-shared/utils';
import { atleastOneTagExists } from 'src/utils/formComponentUtils';
import { renderFileName } from '../shared/render';
import { EditWindowComponent } from './EditWindowComponent';

const useStyles = makeStyles({
  table: {
    marginTop: '2.4rem',
    tableLayout: 'fixed',
    marginBottom: '12px',
    wordBreak: 'break-word',
    textOverflow: 'ellipsis',
  },
  tableMobile: {
    marginTop: '2.4rem',
    tableLayout: 'fixed',
    marginBottom: '12px',
    width: '100%',
    display: 'grid',
    gridTemplateColumns: '5fr 3fr 4fr',
    '& thead': {
      display: 'contents',
      '& tr': {
        display: 'contents',
        '& th': {
          borderBottom: `2px solid ${AltinnAppTheme.altinnPalette.primary.blueMedium}`,
        },
      },
    },
    '& tbody': {
      display: 'contents',
      '& tr': {
        display: 'contents',
        borderBottom: `2px dotted ${AltinnAppTheme.altinnPalette.primary.blueMedium}`,
        '& td': {
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        },
      },
    },
  },
  mobileTableRow: {
    '& td': {
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
      overflow: 'hidden',
      alignItems: 'center',
      display: 'flex',
      alignSelf: 'stretch',
      color: '#000',
    },
  },
  fullGrid: {
    gridColumn: '1 / -1',
  },
  tableHeader: {
    borderBottom: `2px solid ${AltinnAppTheme.altinnPalette.primary.blueMedium}`,
    '& tr': {
      '& th': {
        padding: '0px',
        paddingLeft: '6px',
        fontSize: '1.4rem',
        fontFamily: 'Altinn-DIN',
        fontWeight: '500 !important' as any,
        color: '#000',
      },
    },
  },
  tableBody: {
    '& tr': {
      '& td': {
        padding: '0px',
        paddingLeft: '6px',
        fontSize: '12px',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
        overflow: 'hidden',
        fontFamily: 'Altinn-DIN',
        fontWeight: 400,
        borderBottom: `1px dotted ${AltinnAppTheme.altinnPalette.primary.blueMedium}`,
        color: '#000',
      },
    },
  },
  editIcon: {
    paddingLeft: '6px',
    fontSize: '1.4rem !important',
    fontWeight: '800 !important' as any,
  },
  editTextContainer: {
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    color: '#000',
    fontWeight: '500 !important' as any,
    fontSize: '1.2rem',
  },
  textContainer: {
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    color: '#000',
    fontWeight: '500 !important' as any,
    fontSize: '1.4rem',
    minWidth: '0px',
  },
});

export interface FileListProps {
  id: string;
  attachments: IAttachment[];
  language: ILanguage;
  editIndex: number;
  mobileView: boolean;
  readOnly: boolean;
  options: IOption[];
  getTextResource: (key: string) => string;
  getTextResourceAsString: (key: string) => string;
  onClickEdit: (index: any) => void;
  onClickSave: (attachment: IAttachment) => void;
  onDropdownDataChange: (id: string, value: string) => void;
  setEditIndex: (index: number) => void;
  attachmentValidations: {
    id: string;
    message: string;
  }[];
  textResourceBindings: any;
}

export const bytesInOneMB = 1048576;

export function FileList(props: FileListProps): JSX.Element {
  const classes = useStyles();
  if (!props.attachments || props.attachments.length === 0) {
    return null;
  }
  return (
    <Grid
      container={true}
      item={true}
      data-testid='tagFile'
      id='tagFile'
      spacing={1}
    >
      <TableContainer component={Grid}>
        <Table className={!props.mobileView ? classes.table : classes.tableMobile}>
          {atleastOneTagExists(props.attachments) &&
            <TableHead className={classes.tableHeader}>
              <TableRow className={props.mobileView ? classes.mobileTableRow : ''}>
                <TableCell align='left'>
                  {getLanguageFromKey('form_filler.file_uploader_list_header_name', props.language)}
                </TableCell>
                <TableCell align='left'>
                  {props.getTextResource(props.textResourceBindings.tagTitle)}
                </TableCell>
                {!props.mobileView ?
                  <TableCell align='left'>
                    {getLanguageFromKey('form_filler.file_uploader_list_header_file_size', props.language)}
                  </TableCell>
                  : null}
                {!props.mobileView ?
                  <TableCell align='left'>
                    {getLanguageFromKey('form_filler.file_uploader_list_header_status', props.language)}
                  </TableCell>
                  : null}
                <TableCell />
              </TableRow>
            </TableHead>
          }
          <TableBody className={classes.tableBody}>
            {(props.attachments.length >= 0) && props.attachments.map((attachment: IAttachment, index: number) => {
              // Check if filter is applied and includes specified index.
              if (attachment.tags !== undefined && attachment.tags.length !== 0 && props.editIndex !== index) {
                return (
                  <TableRow
                    key={`altinn-file-list-row-${attachment.id}`}
                    className={props.mobileView ? classes.mobileTableRow : ''}
                  >
                    <TableCell
                      key={`attachment-name-${index}`}
                      className={classes.textContainer}
                    >
                      <div style={{ minWidth: '0px' }}>
                        {renderFileName(props.attachments[index].name)}
                        {props.mobileView ?
                          <div style={{ color: AltinnAppTheme.altinnPalette.primary.grey }}>
                            {attachment.uploaded ?
                              <div>
                                {(attachment.size / bytesInOneMB).toFixed(2)} {getLanguageFromKey('form_filler.file_uploader_mb', props.language)}
                                <i
                                  className='ai ai-check-circle'
                                  aria-label={getLanguageFromKey('form_filler.file_uploader_list_status_done', props.language)}
                                  style={props.mobileView ? { marginLeft: '10px' } : null}
                                />
                              </div>
                              : null}
                            {!attachment.uploaded &&
                              <AltinnLoader
                                id={`attachment-loader-upload-${props.attachments[index].id}`}
                                style={{ marginBottom: '1.6rem', marginRight: '1.3rem' }}
                                srContent={getLanguageFromKey('general.loading', props.language)}
                              />
                            }
                          </div>
                          : null}
                      </div>
                    </TableCell>
                    <TableCell
                      key={`attachment-tag-${index}`}
                      className={classes.textContainer}
                    >
                      {props
                        .getTextResourceAsString(props.options?.find((option) => option.value === attachment.tags[0]).label)
                      }
                    </TableCell>
                    {!props.mobileView ?
                      <TableCell key={`attachment-size-${index}`} className={classes.textContainer}>
                        {`${(attachment.size / bytesInOneMB).toFixed(2)} ${getLanguageFromKey('form_filler.file_uploader_mb', props.language)}`}
                      </TableCell>
                      : null}
                    {!props.mobileView ?
                      <TableCell
                        key={`attachment-status-${index}`}
                        className={classes.textContainer}
                      >
                        {attachment.uploaded &&
                          <div>
                            {getLanguageFromKey('form_filler.file_uploader_list_status_done', props.language)}
                            <i
                              className='ai ai-check-circle'
                              aria-label={getLanguageFromKey('form_filler.file_uploader_list_status_done', props.language)}
                            />
                          </div>
                        }
                        {!attachment.uploaded &&
                          <AltinnLoader
                            id={`attachment-loader-upload-${attachment.id}`}
                            style={{ marginBottom: '1.6rem', marginRight: '1.3rem' }}
                            srContent={getLanguageFromKey('general.loading', props.language)}
                          />
                        }
                      </TableCell>
                      : null}
                    <TableCell
                      align='right'
                      key={`edit-${index}`}
                    >
                      <IconButton
                        style={{ color: 'black' }}
                        onClick={() => props.onClickEdit(index)}
                        tabIndex={0}
                        className={classes.editTextContainer}
                      >
                        {getLanguageFromKey('general.edit_alt', props.language)}
                        <i className={`fa fa-editing-file ${classes.editIcon}`} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              }
              return ( // If no tag on attachment, show edit window
                <TableRow
                  key={`altinn-unchosen-option-attachment-row-${index}`}
                >
                  <TableCell
                    className={props.mobileView ? classes.fullGrid : ''}
                    colSpan={!props.mobileView ? 5 : undefined}
                  >
                    <EditWindowComponent
                        id={props.id}
                        attachment={props.attachments[index]}
                        attachmentValidations={props.attachmentValidations}
                        language={props.language}
                        mobileView={props.mobileView}
                        readOnly={props.readOnly}
                        options={props.options}
                        getTextResource={props.getTextResource}
                        getTextResourceAsString={props.getTextResourceAsString}
                        onClickSave={props.onClickSave}
                        onDropdownDataChange={props.onDropdownDataChange}
                        setEditIndex={props.setEditIndex}
                        textResourceBindings={props.textResourceBindings} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Grid>
  );
};

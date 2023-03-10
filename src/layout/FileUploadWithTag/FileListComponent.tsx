import React from 'react';

import {
  Grid,
  IconButton,
  makeStyles,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@material-ui/core';

import { AltinnLoader } from 'src/components/AltinnLoader';
import { getLanguageFromKey } from 'src/language/sharedLanguage';
import { FileName } from 'src/layout/FileUpload/shared/render';
import { EditWindowComponent } from 'src/layout/FileUploadWithTag/EditWindowComponent';
import { AltinnAppTheme } from 'src/theme/altinnAppTheme';
import { atleastOneTagExists } from 'src/utils/formComponentUtils';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IAttachment } from 'src/shared/resources/attachments';
import type { IOption } from 'src/types';

const useStyles = makeStyles({
  table: {
    marginTop: '1.5rem',
    tableLayout: 'fixed',
    marginBottom: '12px',
    wordBreak: 'break-word',
    textOverflow: 'ellipsis',
  },
  tableMobile: {
    marginTop: '1.5rem',
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
        fontSize: '0.875rem',
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
    fontSize: '0.875rem !important',
    fontWeight: '800 !important' as any,
  },
  editTextContainer: {
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    color: '#000',
    fontWeight: '500 !important' as any,
    fontSize: '0.75rem',
  },
  textContainer: {
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    color: '#000',
    fontWeight: '500 !important' as any,
    fontSize: '0.875rem',
    minWidth: '0px',
  },
});

export interface FileListProps extends PropsFromGenericComponent<'FileUploadWithTag'> {
  attachments: IAttachment[];
  editIndex: number;
  mobileView: boolean;
  options?: IOption[];
  onEdit: (index: any) => void;
  onSave: (attachment: IAttachment) => void;
  onDropdownDataChange: (id: string, value: string) => void;
  setEditIndex: (index: number) => void;
  attachmentValidations: {
    id: string;
    message: string;
  }[];
}

export const bytesInOneMB = 1048576;

export function FileList(props: FileListProps): JSX.Element | null {
  const classes = useStyles();
  if (!props.attachments || props.attachments.length === 0) {
    return null;
  }

  const { textResourceBindings } = props.node.item;

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
          {atleastOneTagExists(props.attachments) && (
            <TableHead className={classes.tableHeader}>
              <TableRow className={props.mobileView ? classes.mobileTableRow : ''}>
                <TableCell align='left'>
                  {getLanguageFromKey('form_filler.file_uploader_list_header_name', props.language)}
                </TableCell>
                <TableCell align='left'>
                  {textResourceBindings?.tagTitle && props.getTextResource(textResourceBindings.tagTitle)}
                </TableCell>
                {!props.mobileView ? (
                  <TableCell align='left'>
                    {getLanguageFromKey('form_filler.file_uploader_list_header_file_size', props.language)}
                  </TableCell>
                ) : null}
                {!props.mobileView ? (
                  <TableCell align='left'>
                    {getLanguageFromKey('form_filler.file_uploader_list_header_status', props.language)}
                  </TableCell>
                ) : null}
                <TableCell />
              </TableRow>
            </TableHead>
          )}
          <TableBody className={classes.tableBody}>
            {props.attachments.map((attachment: IAttachment, index: number) => {
              // Check if filter is applied and includes specified index.
              if (attachment.tags !== undefined && attachment.tags.length > 0 && props.editIndex !== index) {
                const firstTag = attachment.tags[0];
                const label = props.options?.find((option) => option.value === firstTag)?.label;

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
                        <FileName>{props.attachments[index].name}</FileName>
                        {props.mobileView ? (
                          <div
                            style={{
                              color: AltinnAppTheme.altinnPalette.primary.grey,
                            }}
                          >
                            {attachment.uploaded ? (
                              <div>
                                {(attachment.size / bytesInOneMB).toFixed(2)}{' '}
                                {getLanguageFromKey('form_filler.file_uploader_mb', props.language)}
                                <i
                                  className='ai ai-check-circle'
                                  role='img'
                                  aria-label={getLanguageFromKey(
                                    'form_filler.file_uploader_list_status_done',
                                    props.language,
                                  )}
                                  style={{ marginLeft: '10px' }}
                                />
                              </div>
                            ) : (
                              <AltinnLoader
                                id={`attachment-loader-upload-${props.attachments[index].id}`}
                                style={{
                                  marginBottom: '1rem',
                                  marginRight: '0.8125rem',
                                }}
                                srContent={getLanguageFromKey('general.loading', props.language)}
                              />
                            )}
                          </div>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell
                      key={`attachment-tag-${index}`}
                      className={classes.textContainer}
                    >
                      {label && props.getTextResourceAsString(label)}
                    </TableCell>
                    {!props.mobileView ? (
                      <TableCell
                        key={`attachment-size-${index}`}
                        className={classes.textContainer}
                      >
                        {`${(attachment.size / bytesInOneMB).toFixed(2)} ${getLanguageFromKey(
                          'form_filler.file_uploader_mb',
                          props.language,
                        )}`}
                      </TableCell>
                    ) : null}
                    {!props.mobileView ? (
                      <TableCell
                        key={`attachment-status-${index}`}
                        className={classes.textContainer}
                      >
                        {attachment.uploaded ? (
                          <div>
                            {getLanguageFromKey('form_filler.file_uploader_list_status_done', props.language)}
                            <i className='ai ai-check-circle' />
                          </div>
                        ) : (
                          <AltinnLoader
                            id={`attachment-loader-upload-${attachment.id}`}
                            style={{
                              marginBottom: '1rem',
                              marginRight: '0.8125rem',
                            }}
                            srContent={getLanguageFromKey('general.loading', props.language)}
                          />
                        )}
                      </TableCell>
                    ) : null}
                    <TableCell
                      align='right'
                      key={`edit-${index}`}
                    >
                      <IconButton
                        style={{ color: 'black' }}
                        onClick={() => props.onEdit(index)}
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

              return (
                <TableRow key={`altinn-unchosen-option-attachment-row-${index}`}>
                  <TableCell
                    className={props.mobileView ? classes.fullGrid : ''}
                    colSpan={!props.mobileView ? 5 : undefined}
                  >
                    <EditWindowComponent
                      handleDataChange={props.handleDataChange}
                      formData={props.formData}
                      label={props.label}
                      legend={props.legend}
                      shouldFocus={props.shouldFocus}
                      text={props.text}
                      node={props.node}
                      attachment={props.attachments[index]}
                      attachmentValidations={[
                        ...new Map(
                          props.attachmentValidations.map((validation) => [validation['id'], validation]),
                        ).values(),
                      ]}
                      language={props.language}
                      mobileView={props.mobileView}
                      options={props.options}
                      getTextResource={props.getTextResource}
                      getTextResourceAsString={props.getTextResourceAsString}
                      onSave={props.onSave}
                      onDropdownDataChange={props.onDropdownDataChange}
                      setEditIndex={props.setEditIndex}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Grid>
  );
}

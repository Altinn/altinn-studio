import React from 'react';

import { Button, ButtonColor, ButtonSize, ButtonVariant } from '@digdir/design-system-react';
import { Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@material-ui/core';
import { CheckmarkCircleFillIcon, PencilIcon } from '@navikt/aksel-icons';

import { AltinnLoader } from 'src/components/AltinnLoader';
import { useLanguage } from 'src/hooks/useLanguage';
import { AttachmentFileName } from 'src/layout/FileUpload/shared/AttachmentFileName';
import { EditWindowComponent } from 'src/layout/FileUploadWithTag/EditWindowComponent';
import classes from 'src/layout/FileUploadWithTag/FileListComponent.module.css';
import { AltinnAppTheme } from 'src/theme/altinnAppTheme';
import { atleastOneTagExists } from 'src/utils/formComponentUtils';
import type { IAttachment } from 'src/features/attachments';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IOption } from 'src/types';

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
  const { lang, langAsString } = useLanguage();

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
                <TableCell align='left'>{lang('form_filler.file_uploader_list_header_name')}</TableCell>
                <TableCell align='left'>
                  {textResourceBindings?.tagTitle && props.getTextResource(textResourceBindings.tagTitle)}
                </TableCell>
                {!props.mobileView ? (
                  <TableCell align='left'>{lang('form_filler.file_uploader_list_header_file_size')}</TableCell>
                ) : null}
                {!props.mobileView ? (
                  <TableCell align='left'>{lang('form_filler.file_uploader_list_header_status')}</TableCell>
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
                    <TableCell key={`attachment-name-${index}`}>
                      <div style={{ minWidth: '0px' }}>
                        <AttachmentFileName
                          attachment={props.attachments[index]}
                          mobileView={props.mobileView}
                        />
                        {props.mobileView ? (
                          <div
                            style={{
                              color: AltinnAppTheme.altinnPalette.primary.grey,
                            }}
                          >
                            {attachment.uploaded ? (
                              <div>
                                {(attachment.size / bytesInOneMB).toFixed(2)} {lang('form_filler.file_uploader_mb')}
                                <CheckmarkCircleFillIcon
                                  aria-label={langAsString('form_filler.file_uploader_list_status_done')}
                                  role='img'
                                  style={{ marginLeft: '5px' }}
                                />
                              </div>
                            ) : (
                              <AltinnLoader
                                id={`attachment-loader-upload-${props.attachments[index].id}`}
                                style={{
                                  marginBottom: '1rem',
                                  marginRight: '0.8125rem',
                                }}
                                srContent={langAsString('general.loading')}
                              />
                            )}
                          </div>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell key={`attachment-tag-${index}`}>
                      {label && props.getTextResourceAsString(label)}
                    </TableCell>
                    {!props.mobileView ? (
                      <TableCell key={`attachment-size-${index}`}>
                        {`${(attachment.size / bytesInOneMB).toFixed(2)} ${langAsString(
                          'form_filler.file_uploader_mb',
                        )}`}
                      </TableCell>
                    ) : null}
                    {!props.mobileView ? (
                      <TableCell key={`attachment-status-${index}`}>
                        {attachment.uploaded ? (
                          <div className={classes.fileStatus}>
                            {lang('form_filler.file_uploader_list_status_done')}
                            <CheckmarkCircleFillIcon aria-hidden={true} />
                          </div>
                        ) : (
                          <AltinnLoader
                            id={`attachment-loader-upload-${attachment.id}`}
                            style={{
                              marginBottom: '1rem',
                              marginRight: '0.8125rem',
                            }}
                            srContent={langAsString('general.loading')}
                          />
                        )}
                      </TableCell>
                    ) : null}
                    <TableCell
                      align='right'
                      key={`edit-${index}`}
                    >
                      <Button
                        className={classes.editButton}
                        size={ButtonSize.Small}
                        variant={ButtonVariant.Quiet}
                        color={ButtonColor.Secondary}
                        onClick={() => props.onEdit(index)}
                        icon={<PencilIcon aria-hidden={true} />}
                        iconPlacement='right'
                      >
                        {!props.mobileView && lang('general.edit_alt')}
                      </Button>
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

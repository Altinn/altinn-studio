/* eslint-disable react-perf/jsx-no-new-object-as-prop */
import * as React from 'react';
import DropZone, { FileRejection } from 'react-dropzone';
import { useDispatch, useSelector } from 'react-redux';
import { AltinnAppTheme } from 'altinn-shared/theme';
import { getLanguageFromKey } from 'altinn-shared/utils';
import { AltinnButton, AltinnLoader } from 'altinn-shared/components';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import { isMobile } from 'react-device-detect';
import { removeFileEnding, getFileEnding } from '../../utils/attachment';
import { IAttachment } from '../../shared/resources/attachments';
import AttachmentDispatcher from '../../shared/resources/attachments/attachmentActions';
import '../../styles/FileUploadComponent.css';
import { IRuntimeState , IComponentValidations } from '../../types';
import { renderValidationMessages, renderValidationMessagesForComponent } from '../../utils/render';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { v4 as uuidv4 } from 'uuid';
import { Grid, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, IconButton, makeStyles } from '@material-ui/core';
import classNames from 'classnames';

export interface IFileUploadWithTagProps {
  hasCustomFileEndings?: boolean;
  id: string;
  isValid?: boolean;
  componentValidations?: IComponentValidations;
  language: any;
  optionsId: string;
  maxFileSizeInMB: number;
  maxNumberOfAttachments: number;
  minNumberOfAttachments: number;
  readOnly: boolean;
  validFileEndings?: string;
  getTextResource: (key: string) => string;
  getTextResourceAsString: (key: string) => string;
  textResourceBindings: any;
}

// DropZone styles
const baseStyle = {
  width: 'auto',
  height: '15.6rem',
  borderWidth: '2px',
  borderColor: AltinnAppTheme.altinnPalette.primary.blueMedium,
  borderStyle: 'dotted',
  cursor: 'pointer',
};
const activeStyle = {
  borderStyle: 'solid',
};
const rejectStyle = {
  borderStyle: 'solid',
  borderColor: AltinnAppTheme.altinnPalette.primary.red,
};
const validationErrorStyle = {
  borderStyle: 'dotted',
  borderColor: AltinnAppTheme.altinnPalette.primary.red,
};

// const theme = createTheme(altinnAppTheme);
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
  delete: {
    justifyContent: 'right',
  },
  select: {
    fontSize: '1.6rem',
    '&:focus': {
      outline: `2px solid ${AltinnAppTheme.altinnPalette.primary.blueDark}`,
    },
  },
});

export const bytesInOneMB = 1048576;
export const emptyArray = [];

export function FileUploadWithTagComponent(props: IFileUploadWithTagProps): JSX.Element {
  const dataDispatch = useDispatch();
  const [validations, setValidations] = React.useState<Array<{ id: string, message: string }>>([]);
  const mobileView = useMediaQuery('(max-width:992px)'); // breakpoint on altinn-modal
  const options = useSelector((state: IRuntimeState) => state.optionState.options[props.optionsId]);
  const classes = useStyles();
  // eslint-disable-next-line max-len
  const editIndex = useSelector((state: IRuntimeState) => state.formLayout.uiConfig.fileUploadersWithTag[props.id]?.editIndex ?? -1);
  // eslint-disable-next-line max-len
  const chosenOptions = useSelector((state: IRuntimeState) => state.formLayout.uiConfig.fileUploadersWithTag[props.id]?.chosenOptions ?? {});

  const attachments: IAttachment[] = useSelector(
    (state: IRuntimeState) => state.attachments.attachments[props.id] || emptyArray,
  );

  const getComponentValidations = (): Array<{ id: string, message: string }> => {
    let validationMessages = props.componentValidations;
    const result: Array<{ id: string, message: string }> = [];
    validationMessages = JSON.parse(JSON.stringify(validationMessages || {}));
    if (!validationMessages || !validationMessages.simpleBinding) {
      validationMessages = {
        simpleBinding: {
          errors: [],
          warnings: [],
        },
      };
    }
    if (validationMessages.simpleBinding.errors !== undefined || validationMessages.simpleBinding.errors.length < 1) {
      parseValidationObject(validationMessages.simpleBinding.errors as string[]).forEach((validation) => {
        result.push(validation);
      });
    }
    validations.forEach((validation) => {
      result.push(validation);
    });
    return result;
  };

  const parseValidationObject = (validationArray: string[]): Array<{ id: string, message: string }> => {
    if (validationArray === undefined || validationArray.length === 0) {
      return [];
    }
    const obj: Array<{ id: string, message: string }> = [];
    validationArray.forEach((validation) => {
      const val = validation.toString().split(String.fromCharCode(31));
      if (val.length === 2) {
        obj.push({ id: val[0], message: val[1] });
      } else {
        obj.push({ id: '', message: validation });
      }
    });
    return obj;
  };

  const setValidationsFromArray = (validationArray: string[]) => {
    setValidations(
      validations.concat(parseValidationObject(validationArray)),
    );
  };

  const isAttachmentError = (error: { id: string, message: string }): boolean => {
    return error.id !== '' && error.id !== undefined;
  };

  const isNotAttachmentError = (error: { id: string, message: string }): boolean => {
    return error.id === '' || error.id === undefined;
  };

  const atleastOneTagExists = (): boolean => {
    const totalTagCount: number = attachments
      .map((attachment: IAttachment) => (attachment.tags?.length ? attachment.tags.length : 0))
      .reduce((total, current) => total + current, 0);

    return totalTagCount !== undefined && totalTagCount >= 1;
  };

  const setEditIndex = (index: number) => {
    dataDispatch(FormLayoutActions.updateFileUploaderWithTagEditIndex({
      uploader: props.id, index,
    }));
  };

  const setAttachmentTag = (attachment: IAttachment, optionValue: string) => {
    const option = options?.find((o) => o.value === optionValue);
    if (option !== undefined) {
      AttachmentDispatcher.updateAttachment(attachment, props.id, option.value, props.id);
    } else console.error(`Could not find option for ${optionValue}`);
  };

  const onDropdownDataChange = (id: string, value: string) => {
    if (value !== undefined) {
      const option = options?.find((o) => o.value === value);
      if (option !== undefined) {
        dataDispatch(FormLayoutActions.updateFileUploaderWithTagChosenOptions({
          uploader: props.id, id, option,
        }));
      } else console.error(`Could not find option for ${value}`);
    } else console.error('Should not be called');
  };

  const onClick = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
    event.preventDefault();
  };

  const onClickEdit = (index) => {
    if (editIndex === -1 || editIndex !== index) {
      setEditIndex(index);
    } else {
      setEditIndex(-1);
    }
  };

  const onClickSave = (attachment: IAttachment, value: string = undefined) => {
    const val = value || chosenOptions[attachment.id];
    if (val !== undefined && val.length !== 0) {
      setEditIndex(-1);
      if (attachment.tags === undefined || val !== attachment.tags[0]) {
        setAttachmentTag(attachment, val);
      }
      setValidations(validations.filter((obj) => obj.id !== attachment.id)); // Remove old validation if exists
    } else {
      const tmpValidations: { id: string, message: string }[] = [];
      tmpValidations.push(
        {
          id: attachment.id,
          message: `${getLanguageFromKey('form_filler.file_uploader_validation_error_no_chosen_tag', props.language)} ${props.getTextResource(props.textResourceBindings.tagTitle).toLowerCase()}.`,
        },
      );
      setValidations(validations.filter((obj) => obj !== tmpValidations[0]).concat(tmpValidations));
    }
  };

  const handleDeleteFile = (index: number) => {
    AttachmentDispatcher.deleteAttachment(attachments[index], props.id, props.id);
    setEditIndex(-1);
  };

  const shouldShowFileUpload = (): boolean => {
    if (attachments.length < props.maxNumberOfAttachments) {
      return true;
    }
    return false;
  };

  const tagSaveIsDisabled = (attachment: IAttachment): boolean => {
    return (attachment.uploaded === false || attachment.updating === true);
  };

  const renderFileUploadContent = (): JSX.Element => {
    return (
      <div className='container'>
        <div className='col text-center icon' style={{ marginTop: '3.5rem' }} >
          <i className='ai ai-upload' />
        </div>
        <div className='col text-center'>
          <label
            htmlFor={props.id}
            className='file-upload-text-bold'
            id='file-upload-description'
          >
            {isMobile ?
              <>
                {getLanguageFromKey('form_filler.file_uploader_upload', props.language)}
              </>
              :
              <>
                {getLanguageFromKey('form_filler.file_uploader_drag', props.language)}
                <span className='file-upload-text-bold blue-underline'>
                  {` ${getLanguageFromKey('form_filler.file_uploader_find', props.language)}`}
                </span>
              </>
            }
          </label>
        </div>
        <div className='col text-center'>
          <label
            htmlFor={props.id}
            className='file-upload-text'
            id='file-format-description'
          >
            {getLanguageFromKey('form_filler.file_uploader_valid_file_format', props.language)}
            {props.hasCustomFileEndings ? (` ${props.validFileEndings}`) :
              (` ${getLanguageFromKey('form_filler.file_upload_valid_file_format_all', props.language)}`)}
          </label>
        </div>
      </div>
    );
  };

  const renderAttachmentsCounter = (): JSX.Element => {
    return (
      <div
        className='file-upload-text-bold-small'
        id='number-of-attachments'
      >
        {
          `${getLanguageFromKey('form_filler.file_uploader_number_of_files', props.language)} ${props.minNumberOfAttachments ? `${attachments.length}/${props.maxNumberOfAttachments}`
            : attachments.length}.`
        }
      </div>
    );
  };

  const onDrop = (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    const newFiles: IAttachment[] = [];
    const fileType = props.id;
    const tmpValidations: string[] = [];
    const totalAttachments = acceptedFiles.length + rejectedFiles.length + attachments.length;

    if (totalAttachments > props.maxNumberOfAttachments) {
      // if the user adds more attachments than max, all should be ignored
      tmpValidations.push(
        `${getLanguageFromKey('form_filler.file_uploader_validation_error_exceeds_max_files_1', props.language)
        } ${props.maxNumberOfAttachments} ${getLanguageFromKey('form_filler.file_uploader_validation_error_exceeds_max_files_2', props.language)}`,
      );
    } else {
      // we should upload all files, if any rejected files we should display an error
      acceptedFiles.forEach((file: File) => {
        if ((attachments.length + newFiles.length) < props.maxNumberOfAttachments) {
          const tmpId: string = uuidv4();
          newFiles.push({
            name: file.name, size: file.size, uploaded: false, tags: [], id: tmpId, deleting: false, updating: false,
          });
          AttachmentDispatcher.uploadAttachment(file, fileType, tmpId, props.id);
        }
      });

      if (rejectedFiles.length > 0) {
        rejectedFiles.forEach((fileRejection) => {
          if (fileRejection.file.size > (props.maxFileSizeInMB * bytesInOneMB)) {
            tmpValidations.push(
              `${fileRejection.file.name} ${getLanguageFromKey('form_filler.file_uploader_validation_error_file_size', props.language)}`,
            );
          } else {
            tmpValidations.push(
              `${getLanguageFromKey('form_filler.file_uploader_validation_error_general_1', props.language)} ${fileRejection.file.name} ${getLanguageFromKey('form_filler.file_uploader_validation_error_general_2', props.language)}`,
            );
          }
        });
      }
    }
    setValidationsFromArray(tmpValidations);
  };

  const renderFileList = (): JSX.Element => {
    if (!attachments || attachments.length === 0) {
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
          <Table className={!mobileView ? classes.table : classes.tableMobile}>
            {atleastOneTagExists() &&
              <TableHead className={classes.tableHeader}>
                <TableRow className={mobileView ? classes.mobileTableRow : ''}>
                  <TableCell align='left'>
                    {getLanguageFromKey('form_filler.file_uploader_list_header_name', props.language)}
                  </TableCell>
                  <TableCell align='left'>
                    {props.getTextResource(props.textResourceBindings.tagTitle)}
                  </TableCell>
                  {!mobileView ?
                    <TableCell align='left'>
                      {getLanguageFromKey('form_filler.file_uploader_list_header_file_size', props.language)}
                    </TableCell>
                    : null}
                  {!mobileView ?
                    <TableCell align='left'>
                      {getLanguageFromKey('form_filler.file_uploader_list_header_status', props.language)}
                    </TableCell>
                    : null}
                  <TableCell />
                </TableRow>
              </TableHead>
            }
            <TableBody className={classes.tableBody}>
              {(attachments.length >= 0) && attachments.map((attachment: IAttachment, index: number) => {
                // Check if filter is applied and includes specified index.
                if (attachment.tags !== undefined && attachment.tags.length !== 0 && editIndex !== index) {
                  return (
                    <TableRow
                      key={`altinn-file-list-row-${attachment.id}`}
                      className={mobileView ? classes.mobileTableRow : ''}
                    >
                      <TableCell
                        key={`attachment-name-${index}`}
                        className={classes.textContainer}
                      >
                        <div style={{ minWidth: '0px' }}>
                          {renderFileName(attachments[index].name)}
                          {mobileView ?
                            <div style={{ color: AltinnAppTheme.altinnPalette.primary.grey }}>
                              {attachment.uploaded ?
                                <div>
                                  {(attachment.size / bytesInOneMB).toFixed(2)} {getLanguageFromKey('form_filler.file_uploader_mb', props.language)}
                                  <i
                                    className='ai ai-check-circle'
                                    aria-label={getLanguageFromKey('form_filler.file_uploader_list_status_done', props.language)}
                                    style={mobileView ? { marginLeft: '10px' } : null}
                                  />
                                </div>
                                : null}
                              {!attachment.uploaded &&
                                <AltinnLoader
                                  id='loader-upload'
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
                          .getTextResource(options?.find((option) => option.value === attachment.tags[0]).label)
                        }
                      </TableCell>
                      {!mobileView ?
                        <TableCell key={`attachment-size-${index}`} className={classes.textContainer}>
                          {`${(attachment.size / bytesInOneMB).toFixed(2)} ${getLanguageFromKey('form_filler.file_uploader_mb', props.language)}`}
                        </TableCell>
                        : null}
                      {!mobileView ?
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
                              id='loader-upload'
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
                          onClick={() => onClickEdit(index)}
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
                      className={mobileView ? classes.fullGrid : ''}
                      colSpan={!mobileView ? 5 : undefined}
                    >
                      {renderEditWindow(index)}
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

  const renderEditWindow = (newIndex = -1): JSX.Element => {
    let index = -1;
    if (newIndex !== -1) {
      index = newIndex;
    } else {
      index = editIndex;
    }
    return (
      <div className={classes.editContainer}>
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
            {renderFileName(attachments[index].name)}
          </Grid>
          <Grid
            className={classes.textContainer}
            style={{ flexShrink: 0 }}
          >
            <div style={{ display: 'flex' }}>
              {attachments[index].uploaded &&
                <div style={{ marginLeft: '1.5rem', marginRight: '1.5rem' }}>
                  {!mobileView ? getLanguageFromKey('form_filler.file_uploader_list_status_done', props.language) : undefined}
                  <i
                    className='ai ai-check-circle'
                    aria-label={getLanguageFromKey('form_filler.file_uploader_list_status_done', props.language)}
                  />
                </div>
              }
              {!attachments[index].uploaded &&
                <AltinnLoader
                  id='loader-upload'
                  style={{
                    width: '80px',
                  }}
                  srContent={getLanguageFromKey('general.loading', props.language)}
                />
              }
              <div>
                <IconButton
                  classes={{ root: classes.deleteButton }}
                  onClick={() => handleDeleteFile(index)}
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
                id={props.id}
                tabIndex={0}
                defaultValue={attachments[index].tags !== undefined ? attachments[index].tags[0] : null}
                disabled={attachments[index].updating ? true : props.readOnly}
                className={classNames(classes.select, 'custom-select a-custom-select', { 'validation-error': attachmentValidationMessages.filter((i) => i.id === attachments[index].id).length > 0, 'disabled !important': attachments[index].updating ? true : props.readOnly })}
                onChange={(e) => onDropdownDataChange(attachments[index].id, e.target.value)}
                onBlur={(e) => onDropdownDataChange(attachments[index].id, e.target.value)}
              >
                <option style={{ display: 'none' }} />
                {options?.map((option, optionIndex) => (
                  <option
                    // eslint-disable-next-line react/no-array-index-key
                    key={optionIndex}
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
              {attachments[index].updating ?
                <AltinnLoader
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
                    onClickFunction={() => onClickSave(attachments[index])}
                    id={`add-button-grp-${props.id}`}
                    disabled={tagSaveIsDisabled(attachments[index]) ? true : props.readOnly}
                  />
                </div>
              }
            </Grid>
          </Grid>
        </Grid>
        {attachmentValidationMessages.filter((i) => i.id === attachments[index].id).length > 0 ?
          <div
            style={{
              whiteSpace: 'pre-wrap',
            }}
          >
            {renderValidationMessages(attachmentValidationMessages.filter((i) => i.id === attachments[index].id).map((e) => { return e.message; }), props.id, 'error')}
          </div>
          : undefined
        }
      </div>
    );
  };

  const renderFileName = (filename: string): JSX.Element => {
    return (
      <div
        style={{
          display: 'flex',
          flexGrow: 0,
        }}
      >
        <div
          style={{
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}
        >
          {removeFileEnding(filename)}
        </div>
        <div>
          {getFileEnding(filename)}
        </div>
      </div>
    );
  };

  // Get validations and filter general from identified validations.
  const tmpValidationMessages = getComponentValidations();
  const validationMessages = { errors: tmpValidationMessages.filter(isNotAttachmentError).map((el) => (el.message)) };
  const attachmentValidationMessages = tmpValidationMessages.filter(isAttachmentError);
  const hasValidationMessages: boolean = validationMessages.errors.length > 0;

  return (
    <div
      className='container'
      id={`altinn-fileuploader-${props.id}`}
      style={{ padding: '0px' }}
    >
      {shouldShowFileUpload() &&
        <div>
          <div
            className='file-upload-text-bold-small'
            id='max-size'
          >
            {
              `${getLanguageFromKey('form_filler.file_uploader_max_size', props.language)
              } ${props.maxFileSizeInMB} ${getLanguageFromKey('form_filler.file_uploader_mb', props.language)}`
            }
          </div>
          <DropZone
            onDrop={onDrop}
            maxSize={props.maxFileSizeInMB * bytesInOneMB} // mb to bytes
            disabled={props.readOnly}
            accept={(props.hasCustomFileEndings) ? props.validFileEndings : null}
          >
            {({
              getRootProps, getInputProps, isDragActive, isDragReject,
            }) => {
              let styles = { ...baseStyle };
              styles = isDragActive ? { ...styles, ...activeStyle } : styles;
              styles = isDragReject ? { ...styles, ...rejectStyle } : styles;
              styles = (hasValidationMessages) ? { ...styles, ...validationErrorStyle } : styles;

              return (
                <div
                  {...getRootProps({
                    onClick,
                  })}
                  style={styles}
                  id={`altinn-drop-zone-${props.id}`}
                  className={`file-upload${hasValidationMessages ? ' file-upload-invalid' : ''}`}
                  aria-describedby={`description-${props.id} file-upload-description file-format-description max-size number-of-attachments`}
                  aria-labelledby={`label-${props.id}`}
                  role='button'
                >
                  <input
                    {...getInputProps()}
                    id={props.id}
                  />
                  {renderFileUploadContent()}
                </div>
              );
            }}
          </DropZone>
        </div>
      }

      {shouldShowFileUpload() && renderAttachmentsCounter()}

      {(hasValidationMessages && shouldShowFileUpload()) &&
        renderValidationMessagesForComponent(validationMessages, props.id)
      }

      {renderFileList()}

      {!shouldShowFileUpload() && renderAttachmentsCounter()}

      {(hasValidationMessages && !shouldShowFileUpload()) &&
        renderValidationMessagesForComponent(validationMessages, props.id)
      }

    </div>
  );
}

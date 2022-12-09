import React, { useState } from 'react';

import {
  Button,
  ButtonColor,
  ButtonVariant,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@altinn/altinn-design-system';
import { createTheme, Grid, makeStyles, useMediaQuery } from '@material-ui/core';
import { Delete as DeleteIcon, Edit as EditIcon, ErrorColored as ErrorIcon } from '@navikt/ds-icons';
import cn from 'classnames';

import { ExprDefaultsForGroup } from 'src/features/expressions';
import { useExpressions } from 'src/features/expressions/useExpressions';
import { RepeatingGroupsEditContainer } from 'src/features/form/containers/RepeatingGroupsEditContainer';
import { getFormDataForComponentInRepeatingGroup, getTextResource } from 'src/utils/formComponentUtils';
import { createRepeatingGroupComponents } from 'src/utils/formLayout';
import { setupGroupComponents } from 'src/utils/layout';
import { componentHasValidations, repeatingGroupHasValidations } from 'src/utils/validation';
import type { IFormData } from 'src/features/form/data';
import type { ILayout, ILayoutCompInput, ILayoutComponent, ILayoutGroup } from 'src/features/form/layout';
import type { IAttachments } from 'src/shared/resources/attachments';
import type { IOptions, IRepeatingGroups, ITextResource, ITextResourceBindings, IValidations } from 'src/types';

import { DeleteWarningPopover } from 'src/components/molecules/DeleteWarningPopover';
import altinnAppTheme from 'src/theme/altinnAppTheme';
import { getLanguageFromKey, getTextResourceByKey } from 'src/utils/sharedUtils';
import type { ILanguage } from 'src/types/shared';
import { fullWidthWrapper, xPaddingLarge, xPaddingMedium, xPaddingSmall } from '../components/FullWidthWrapper';

export interface IRepeatingGroupTableProps {
  id: string;
  container: ILayoutGroup;
  components: (ILayoutComponent | ILayoutGroup)[];
  repeatingGroupIndex: number;
  repeatingGroups: IRepeatingGroups | null;
  repeatingGroupDeepCopyComponents: (ILayoutComponent | ILayoutGroup)[][];
  hiddenFields: string[];
  formData: IFormData;
  attachments: IAttachments;
  options: IOptions;
  textResources: ITextResource[];
  language: ILanguage;
  currentView: string;
  layout: ILayout | null;
  validations: IValidations;
  editIndex: number;
  setEditIndex: (index: number, forceValidation?: boolean) => void;
  onClickRemove: (groupIndex: number) => void;
  setMultiPageIndex?: (index: number) => void;
  multiPageIndex?: number;
  deleting: boolean;
  hideDeleteButton?: boolean;
  filteredIndexes?: number[] | null;
}

const theme = createTheme(altinnAppTheme);

const cellMargin = 15;
const useStyles = makeStyles({
  fullWidthWrapper,
  groupContainer: {
    overflowX: 'auto',
    marginBottom: 15,

    // Line up content with page
    '& > table > tbody > tr > td:first-child, & > table > thead > tr > th:first-child': {
      paddingLeft: xPaddingSmall - cellMargin,
      '@media (min-width: 768px)': {
        paddingLeft: xPaddingMedium - cellMargin,
      },
      '@media (min-width: 992px)': {
        paddingLeft: xPaddingLarge - cellMargin,
      },
    },
    '& > table > tbody > tr > td:last-child, & > table > thead > tr > th:last-child': {
      paddingRight: xPaddingSmall - cellMargin,
      '@media (min-width: 768px)': {
        paddingRight: xPaddingMedium - cellMargin,
      },
      '@media (min-width: 992px)': {
        paddingRight: xPaddingLarge - cellMargin,
      },
    },
  },
  nestedGroupContainer: {
    overflowX: 'auto',
    margin: '0 0 15px 0',
    width: '100%',
  },
  tableEmpty: {
    margin: 0,
  },
  editingBorder: {
    width: 'calc(100% - 2px)',
    margin: '0 auto',
    '& $editContainerRow': {
      borderRight: `2px dotted ${theme.altinnPalette.primary.blueMedium}`,
      borderLeft: `2px dotted ${theme.altinnPalette.primary.blueMedium}`,
    },
    '& $editingRow': {
      borderRight: `2px dotted ${theme.altinnPalette.primary.blueMedium}`,
      borderLeft: `2px dotted ${theme.altinnPalette.primary.blueMedium}`,
    },
  },
  errorIcon: {
    fontSize: '2em',
    minWidth: '0px',
    minHeight: '0px',
    width: 'auto',
    color: theme.altinnPalette.primary.red,
    marginBottom: '2px',
    marginTop: '1px',
    paddingRight: '4px',
  },
  editIcon: {
    paddingRight: '6px',
    fontSize: '28px',
    marginTop: '-2px',
    '@media (max-width: 768px)': {
      margin: '0px',
      padding: '0px',
    },
  },
  tableEditButton: {
    color: theme.altinnPalette.primary.blueDark,
    fontWeight: 700,
    borderRadius: '5px',
    padding: '6px 12px',
    margin: '8px 2px',
    '&:hover': {
      background: 'none',
      outline: `1px dotted ${theme.altinnPalette.primary.blueDark}`,
    },
    '&:focus': {
      background: theme.altinnPalette.primary.blueLighter,
      outline: `2px dotted ${theme.altinnPalette.primary.blueDark}`,
    },
  },
  editButtonActivated: {
    background: theme.altinnPalette.primary.blueLighter,
    outline: `2px dotted ${theme.altinnPalette.primary.blueDark}`,
  },
  deleteButton: {
    color: theme.altinnPalette.primary.red,
    fontWeight: 700,
    padding: '8px 12px 6px 6px',
    borderRadius: '0',
    marginRight: '-12px',
    '@media (min-width:768px)': {
      margin: '0',
    },
    '&:hover': {
      background: theme.altinnPalette.primary.red,
      color: theme.altinnPalette.primary.white,
    },
    '&:focus': {
      outlineColor: theme.altinnPalette.primary.red,
    },
    '& .ai': {
      fontSize: '2em',
      marginTop: '-3px',
    },
  },
  editContainerRow: {
    borderTop: `1px solid ${theme.altinnPalette.primary.blueLight}`,
    borderBottom: `2px dotted ${theme.altinnPalette.primary.blueMedium}`,
    backgroundColor: '#f1fbff',
    '& > td > div': {
      margin: 0,
    },
  },
  editingRow: {
    borderTop: `2px dotted ${theme.altinnPalette.primary.blueMedium}`,
    backgroundColor: '#f1fbff',
    '& > td': {
      borderBottom: 0,
    },
  },
  visuallyHidden: {
    border: 0,
    padding: 0,
    margin: 0,
    position: 'absolute',
    height: '1px',
    width: '1px',
    overflow: 'hidden',
    clip: 'rect(1px 1px 1px 1px)',
    clipPath: 'inset(50%)',
    whiteSpace: 'nowrap',
  },
  popoverCurrentCell: {
    zIndex: 1,
    position: 'relative',
  },
  buttonCell: {
    minWidth: 'unset',
    maxWidth: 'unset',
    width: '1px', // Shrinks column width
    '& > div': {
      margin: 0,
    },
  },
  buttonInCellWrapper: {
    display: 'inline-flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    width: '100%',
  },
  tableRowError: {
    backgroundColor: theme.altinnPalette.primary.redLight,
  },
  tableButton: {
    width: 'max-content', // Stops column from shrinking too much
  },
});

function getEditButtonText(
  language: ILanguage,
  isEditing: boolean,
  textResources: ITextResource[],
  textResourceBindings?: ITextResourceBindings,
) {
  if (isEditing && textResourceBindings?.edit_button_close) {
    return getTextResourceByKey(textResourceBindings?.edit_button_close, textResources);
  } else if (!isEditing && textResourceBindings?.edit_button_open) {
    return getTextResourceByKey(textResourceBindings?.edit_button_open, textResources);
  }

  return isEditing
    ? getLanguageFromKey('general.save_and_close', language)
    : getLanguageFromKey('general.edit_alt', language);
}

function getTableTitle(component: ILayoutComponent) {
  if (component.textResourceBindings?.tableTitle) {
    return component.textResourceBindings.tableTitle;
  }
  if (component.textResourceBindings?.title) {
    return component.textResourceBindings.title;
  }
  return '';
}

function getTextAlignment(component: ILayoutComponent): 'left' | 'center' | 'right' {
  const formatting = (component as ILayoutCompInput).formatting;
  if (formatting && formatting.align) {
    return formatting.align;
  }
  if (formatting && formatting.number) {
    return 'right';
  }
  return 'left';
}

export function RepeatingGroupTable({
  id,
  container,
  components,
  repeatingGroupIndex,
  repeatingGroupDeepCopyComponents,
  editIndex,
  formData,
  attachments,
  options,
  textResources,
  currentView,
  hiddenFields,
  language,
  layout,
  repeatingGroups,
  validations,
  setEditIndex,
  onClickRemove,
  hideDeleteButton,
  setMultiPageIndex,
  multiPageIndex,
  deleting,
  filteredIndexes,
}: IRepeatingGroupTableProps): JSX.Element {
  const classes = useStyles();
  const mobileView = useMediaQuery('(max-width:992px)');
  const mobileViewSmall = useMediaQuery('(max-width:768px)');

  const edit = useExpressions(container.edit, {
    forComponentId: id,
    defaults: ExprDefaultsForGroup.edit,
  });

  const tableHeaderComponentIds = container.tableHeaders || components.map((c) => c.baseComponentId || c.id) || [];

  const componentsDeepCopy: ILayoutComponent[] = JSON.parse(JSON.stringify(components));
  const tableComponents = componentsDeepCopy.filter((component: ILayoutComponent) => {
    const childId = component.baseComponentId || component.id;
    return tableHeaderComponentIds.includes(childId);
  });

  // Values adjusted for filter
  const numRows = filteredIndexes ? filteredIndexes.length : repeatingGroupIndex + 1;
  const editRowIndex = filteredIndexes ? filteredIndexes.indexOf(editIndex) : editIndex;

  const isEmpty = numRows === 0;
  const showTableHeader = numRows > 0 && !(numRows == 1 && editRowIndex == 0);
  const [popoverPanelIndex, setPopoverPanelIndex] = useState(-1);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const getFormDataForComponent = (component: ILayoutComponent | ILayoutGroup, index: number): string => {
    return getFormDataForComponentInRepeatingGroup(
      formData,
      attachments,
      component,
      index,
      container.dataModelBindings?.group,
      textResources,
      options,
      repeatingGroups,
    );
  };

  const isNested = typeof container.baseComponentId === 'string';

  const onOpenChange = (index: number) => {
    if (index == popoverPanelIndex && popoverOpen) {
      setPopoverPanelIndex(-1);
    } else {
      setPopoverPanelIndex(index);
    }
  };

  const handlePopoverDeleteClick = (index: number) => {
    return () => {
      onClickRemove(index);
      onOpenChange(index);
      setPopoverOpen(false);
    };
  };

  const handleDeleteClick = (index: number) => {
    if (edit?.alertOnDelete) {
      onOpenChange(index);
    } else {
      onClickRemove(index);
    }
  };

  const handleEditClick = (groupIndex: number) => {
    if (groupIndex === editIndex) {
      setEditIndex(-1);
    } else {
      setEditIndex(groupIndex);
    }
  };

  const childElementHasErrors = (element: ILayoutGroup | ILayoutComponent, index: number) => {
    if (element.type === 'Group') {
      return childGroupHasErrors(element as ILayoutGroup, index);
    }
    return componentHasValidations(validations, currentView, `${element.id}`);
  };

  const childGroupHasErrors = (childGroup: ILayoutGroup, index: number) => {
    if (!repeatingGroups || !layout) {
      return;
    }

    const childGroupIndex = repeatingGroups[childGroup.id]?.index;
    const childGroupComponents = layout.filter((childElement) => childGroup.children?.indexOf(childElement.id) > -1);
    const childRenderComponents = setupGroupComponents(
      childGroupComponents,
      childGroup.dataModelBindings?.group,
      index,
    );
    const deepCopyComponents = createRepeatingGroupComponents(
      childGroup,
      childRenderComponents,
      childGroupIndex,
      textResources,
      hiddenFields,
    );
    return repeatingGroupHasValidations(
      childGroup,
      deepCopyComponents,
      validations,
      currentView,
      repeatingGroups,
      layout,
      hiddenFields,
    );
  };

  const renderRepeatingGroupsEditContainer = () => {
    return (
      editIndex >= 0 && (
        <RepeatingGroupsEditContainer
          container={container}
          editIndex={editIndex}
          setEditIndex={setEditIndex}
          repeatingGroupIndex={repeatingGroupIndex}
          id={id}
          language={language}
          textResources={textResources}
          layout={layout}
          repeatingGroupDeepCopyComponents={repeatingGroupDeepCopyComponents}
          hideSaveButton={edit?.saveButton === false}
          multiPageIndex={multiPageIndex}
          setMultiPageIndex={setMultiPageIndex}
          showSaveAndNextButton={edit?.saveAndNextButton === true}
          filteredIndexes={filteredIndexes}
        />
      )
    );
  };

  return (
    <Grid
      container={true}
      item={true}
      data-testid={`group-${id}`}
      id={`group-${id}`}
      className={cn({
        [classes.fullWidthWrapper]: !isNested,
        [classes.groupContainer]: !isNested,
        [classes.nestedGroupContainer]: isNested,
        [classes.tableEmpty]: isEmpty,
      })}
    >
      <Table
        id={`group-${id}-table`}
        className={cn({ [classes.editingBorder]: isNested })}
      >
        {showTableHeader && !mobileView && (
          <TableHeader id={`group-${id}-table-header`}>
            <TableRow>
              {tableComponents.map((component: ILayoutComponent) => (
                <TableCell
                  style={{ textAlign: getTextAlignment(component) }}
                  key={component.id}
                >
                  {getTextResource(getTableTitle(component), textResources)}
                </TableCell>
              ))}
              <TableCell style={{ padding: 0, paddingRight: '10px' }}>
                <span className={classes.visuallyHidden}>{getLanguageFromKey('general.edit', language)}</span>
              </TableCell>
              {!hideDeleteButton && (
                <TableCell style={{ padding: 0 }}>
                  <span className={classes.visuallyHidden}>{getLanguageFromKey('general.delete', language)}</span>
                </TableCell>
              )}
            </TableRow>
          </TableHeader>
        )}
        <TableBody id={`group-${id}-table-body`}>
          {repeatingGroupIndex >= 0 &&
            [...Array(repeatingGroupIndex + 1)].map((_x: any, index: number) => {
              const rowHasErrors = repeatingGroupDeepCopyComponents[index].some(
                (component: ILayoutComponent | ILayoutGroup) => {
                  return childElementHasErrors(component, index);
                },
              );

              const isEditingRow = index === editIndex;

              const editButtonText = rowHasErrors
                ? getLanguageFromKey('general.edit_alt_error', language)
                : getEditButtonText(language, isEditingRow, textResources, container.textResourceBindings);

              const deleteButtonText = getLanguageFromKey('general.delete', language);

              const firstCellData = getFormDataForComponent(components[0], index);

              // Check if filter is applied and includes specified index.
              if (filteredIndexes && !filteredIndexes.includes(index)) {
                return null;
              }

              return (
                <React.Fragment key={index}>
                  <TableRow
                    key={`repeating-group-row-${index}`}
                    className={cn({
                      [classes.editingRow]: isEditingRow,
                      [classes.tableRowError]: rowHasErrors,
                    })}
                  >
                    {!mobileView ? (
                      tableComponents.map((component: ILayoutComponent) => (
                        <TableCell
                          key={`${component.id}-${index}`}
                          style={{ textAlign: getTextAlignment(component) }}
                        >
                          <span>{!isEditingRow ? getFormDataForComponent(component, index) : null}</span>
                        </TableCell>
                      ))
                    ) : (
                      <TableCell>
                        {tableComponents.map(
                          (component: ILayoutComponent, i, { length }) =>
                            !isEditingRow && (
                              <React.Fragment key={`${component.id}-${index}`}>
                                <b>{getTextResource(getTableTitle(component), textResources)}:</b>
                                <br />
                                <span>{getFormDataForComponent(component, index)}</span>
                                {i < length - 1 && <div style={{ height: 8 }} />}
                              </React.Fragment>
                            ),
                        )}
                      </TableCell>
                    )}
                    {!mobileView ? (
                      <>
                        <TableCell
                          key={`edit-${index}`}
                          className={classes.buttonCell}
                        >
                          <div className={classes.buttonInCellWrapper}>
                            <Button
                              variant={ButtonVariant.Quiet}
                              color={ButtonColor.Secondary}
                              icon={rowHasErrors ? <ErrorIcon aria-hidden='true' /> : <EditIcon aria-hidden='true' />}
                              iconPlacement='right'
                              onClick={() => handleEditClick(index)}
                              aria-label={`${editButtonText}-${firstCellData}`}
                              data-testid='edit-button'
                              className={classes.tableButton}
                            >
                              {editButtonText}
                            </Button>
                          </div>
                        </TableCell>
                        {!hideDeleteButton && (
                          <TableCell
                            key={`delete-${index}`}
                            className={cn(
                              {
                                [classes.popoverCurrentCell]: index == popoverPanelIndex,
                              },
                              classes.buttonCell,
                            )}
                          >
                            <div className={classes.buttonInCellWrapper}>
                              <DeleteWarningPopover
                                trigger={
                                  <Button
                                    variant={ButtonVariant.Quiet}
                                    color={ButtonColor.Danger}
                                    icon={<DeleteIcon aria-hidden='true' />}
                                    iconPlacement='right'
                                    disabled={deleting}
                                    onClick={() => handleDeleteClick(index)}
                                    aria-label={`${deleteButtonText}-${firstCellData}`}
                                    data-testid='delete-button'
                                    className={classes.tableButton}
                                  >
                                    {deleteButtonText}
                                  </Button>
                                }
                                side='left'
                                language={language}
                                deleteButtonText={getLanguageFromKey(
                                  'group.row_popover_delete_button_confirm',
                                  language,
                                )}
                                messageText={getLanguageFromKey('group.row_popover_delete_message', language)}
                                open={popoverPanelIndex == index && popoverOpen}
                                setPopoverOpen={setPopoverOpen}
                                onCancelClick={() => onOpenChange(index)}
                                onPopoverDeleteClick={handlePopoverDeleteClick(index)}
                              />
                            </div>
                          </TableCell>
                        )}
                      </>
                    ) : (
                      <TableCell
                        className={classes.buttonCell}
                        style={{ verticalAlign: 'top' }}
                      >
                        <div className={classes.buttonInCellWrapper}>
                          <Button
                            variant={ButtonVariant.Quiet}
                            color={ButtonColor.Secondary}
                            icon={rowHasErrors ? <ErrorIcon aria-hidden='true' /> : <EditIcon aria-hidden='true' />}
                            iconPlacement='right'
                            onClick={() => handleEditClick(index)}
                            aria-label={`${editButtonText}-${firstCellData}`}
                            data-testid='edit-button'
                            className={classes.tableButton}
                          >
                            {(isEditingRow || !mobileViewSmall) && editButtonText}
                          </Button>
                          <div style={{ height: 8 }} />
                          <DeleteWarningPopover
                            trigger={
                              <Button
                                variant={ButtonVariant.Quiet}
                                color={ButtonColor.Danger}
                                icon={<DeleteIcon aria-hidden='true' />}
                                iconPlacement='right'
                                disabled={deleting}
                                onClick={() => handleDeleteClick(index)}
                                aria-label={`${deleteButtonText}-${firstCellData}`}
                                data-testid='delete-button'
                                className={classes.tableButton}
                              >
                                {(isEditingRow || !mobileViewSmall) && deleteButtonText}
                              </Button>
                            }
                            side='left'
                            language={language}
                            deleteButtonText={getLanguageFromKey('group.row_popover_delete_button_confirm', language)}
                            messageText={getLanguageFromKey('group.row_popover_delete_message', language)}
                            open={popoverPanelIndex == index && popoverOpen}
                            setPopoverOpen={setPopoverOpen}
                            onCancelClick={() => onOpenChange(index)}
                            onPopoverDeleteClick={handlePopoverDeleteClick(index)}
                          />
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                  {editIndex === index && (
                    <TableRow
                      key={`edit-container-${index}`}
                      className={classes.editContainerRow}
                    >
                      <TableCell
                        style={{ padding: 0, borderTop: 0 }}
                        colSpan={mobileView ? 2 : tableComponents.length + 1 + Number(!hideDeleteButton)}
                      >
                        {renderRepeatingGroupsEditContainer()}
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
        </TableBody>
      </Table>
    </Grid>
  );
}

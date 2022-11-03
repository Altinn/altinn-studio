import React, { useState } from 'react';

import { createTheme, Grid, IconButton, makeStyles, TableCell, TableRow, useMediaQuery } from '@material-ui/core';
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

import {
  AltinnMobileTable,
  AltinnMobileTableItem,
  AltinnTable,
  AltinnTableBody,
  AltinnTableHeader,
  AltinnTableRow,
} from 'altinn-shared/components';
import { DeleteWarningPopover } from 'altinn-shared/components/molecules/DeleteWarningPopover';
import altinnAppTheme from 'altinn-shared/theme/altinnAppTheme';
import { getLanguageFromKey, getTextResourceByKey } from 'altinn-shared/utils';
import type { IMobileTableItem } from 'altinn-shared/components/molecules/AltinnMobileTableItem';
import type { ILanguage } from 'altinn-shared/types';

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

const useStyles = makeStyles({
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
  editContainerInTable: {
    borderTop: `1px solid ${theme.altinnPalette.primary.blueLight}`,
    marginBottom: 0,
  },
  editContainerRow: {
    '&:hover': {
      background: 'unset !important',
    },
    '& td': {
      whiteSpace: 'normal',
    },
  },
  editingRow: {
    backgroundColor: 'rgba(227, 247, 255, 0.5)',
    '& td': {
      borderBottom: 0,
      '&:nth-child(1)': {
        padding: 0,
        '&::before': {
          display: 'block',
          content: "' '",
          marginTop: '-15px',
          width: '100%',
          position: 'absolute',
          borderTop: `2px dotted ${theme.altinnPalette.primary.blueMedium}`,
        },
        '& span': {
          padding: '36px',
        },
      },
    },
  },
  aboveEditingRow: {
    '& td': {
      borderColor: 'transparent',
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
  const mobileView = useMediaQuery('(max-width:992px)'); // breakpoint on altinn-modal

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

  const showTableHeader = repeatingGroupIndex > -1 && !(repeatingGroupIndex == 0 && editIndex == 0);
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
          className={classes.editContainerInTable}
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
    >
      {!mobileView && (
        <AltinnTable id={`group-${id}-table`}>
          {showTableHeader && (
            <AltinnTableHeader
              showBorder={editIndex !== 0}
              id={`group-${id}-table-header`}
            >
              <TableRow>
                {tableComponents.map((component: ILayoutComponent) => (
                  <TableCell
                    align={getTextAlignment(component)}
                    key={component.id}
                  >
                    {getTextResource(getTableTitle(component), textResources)}
                  </TableCell>
                ))}
                <TableCell style={{ width: '160px', padding: 0, paddingRight: '10px' }}>
                  <span className={classes.visuallyHidden}>{getLanguageFromKey('general.edit', language)}</span>
                </TableCell>
                {!hideDeleteButton && (
                  <TableCell style={{ width: '80px', padding: 0 }}>
                    <span className={classes.visuallyHidden}>{getLanguageFromKey('general.delete', language)}</span>
                  </TableCell>
                )}
              </TableRow>
            </AltinnTableHeader>
          )}
          <AltinnTableBody id={`group-${id}-table-body`}>
            {repeatingGroupIndex >= 0 &&
              [...Array(repeatingGroupIndex + 1)].map((_x: any, index: number) => {
                const rowHasErrors = repeatingGroupDeepCopyComponents[index].some(
                  (component: ILayoutComponent | ILayoutGroup) => {
                    return childElementHasErrors(component, index);
                  },
                );
                const editButtonText = rowHasErrors
                  ? getLanguageFromKey('general.edit_alt_error', language)
                  : getEditButtonText(language, editIndex === index, textResources, container.textResourceBindings);

                const deleteButtonText = getLanguageFromKey('general.delete', language);

                const firstCellData = getFormDataForComponent(components[0], index);

                // Check if filter is applied and includes specified index.
                if (filteredIndexes && !filteredIndexes.includes(index)) {
                  return null;
                }

                return (
                  <React.Fragment key={index}>
                    <AltinnTableRow
                      valid={!rowHasErrors}
                      key={`repeating-group-row-${index}`}
                      className={cn(
                        {
                          [classes.editingRow]: index === editIndex,
                        },
                        {
                          [classes.aboveEditingRow]: index === editIndex - 1,
                        },
                      )}
                    >
                      {tableComponents.map((component: ILayoutComponent) => (
                        <TableCell
                          key={`${component.id}-${index}`}
                          align={getTextAlignment(component)}
                        >
                          <span>{index !== editIndex ? getFormDataForComponent(component, index) : null}</span>
                        </TableCell>
                      ))}
                      <TableCell
                        align='right'
                        style={{
                          width: '160px',
                          padding: 0,
                          paddingRight: '10px',
                        }}
                        key={`edit-${index}`}
                      >
                        <IconButton
                          className={cn(classes.tableEditButton, {
                            [classes.editButtonActivated]: editIndex === index,
                          })}
                          onClick={() => handleEditClick(index)}
                          aria-label={`${editButtonText}-${firstCellData}`}
                        >
                          <i
                            className={
                              rowHasErrors
                                ? `ai ai-circle-exclamation a-icon ${classes.errorIcon} ${classes.editIcon}`
                                : `fa fa-edit ${classes.editIcon}`
                            }
                          />
                          {editButtonText}
                        </IconButton>
                      </TableCell>
                      {!hideDeleteButton && (
                        <TableCell
                          align='center'
                          style={{ width: '80px', padding: 0 }}
                          key={`delete-${index}`}
                          className={cn({
                            [classes.popoverCurrentCell]: index == popoverPanelIndex,
                          })}
                        >
                          <DeleteWarningPopover
                            trigger={
                              <IconButton
                                className={classes.deleteButton}
                                disabled={deleting}
                                onClick={() => handleDeleteClick(index)}
                                aria-label={`${deleteButtonText}-${firstCellData}`}
                              >
                                <i className='ai ai-trash' />
                                {deleteButtonText}
                              </IconButton>
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
                        </TableCell>
                      )}
                    </AltinnTableRow>
                    {editIndex === index && (
                      <TableRow
                        key={`edit-container-${index}`}
                        className={classes.editContainerRow}
                      >
                        <TableCell
                          style={{ padding: 0, borderBottom: 0 }}
                          colSpan={hideDeleteButton ? tableComponents.length + 1 : tableComponents.length + 2}
                        >
                          {renderRepeatingGroupsEditContainer()}
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
          </AltinnTableBody>
        </AltinnTable>
      )}
      {mobileView && (
        <AltinnMobileTable
          id={`group-${id}-table`}
          showBorder={showTableHeader && editIndex !== 0}
        >
          {repeatingGroupIndex >= 0 &&
            [...Array(repeatingGroupIndex + 1)].map((_x: any, index: number) => {
              const rowHasErrors = repeatingGroupDeepCopyComponents[index].some(
                (component: ILayoutComponent | ILayoutGroup) => {
                  return childElementHasErrors(component, index);
                },
              );
              const items: IMobileTableItem[] = tableComponents.map((component: ILayoutComponent) => ({
                key: component.id,
                label: getTextResource(getTableTitle(component), textResources),
                value: getFormDataForComponent(component, index),
              }));
              return (
                <React.Fragment key={index}>
                  <AltinnMobileTableItem
                    key={`mobile-table-item-${index}`}
                    tableItemIndex={index}
                    items={items}
                    valid={!rowHasErrors}
                    editIndex={editIndex}
                    onEditClick={() => handleEditClick(index)}
                    editButtonText={
                      rowHasErrors
                        ? getLanguageFromKey('general.edit_alt_error', language)
                        : getEditButtonText(
                            language,
                            editIndex === index,
                            textResources,
                            container.textResourceBindings,
                          )
                    }
                    editIconNode={
                      <i
                        className={
                          rowHasErrors
                            ? `ai ai-circle-exclamation ${classes.errorIcon}`
                            : `fa fa-edit ${classes.editIcon}`
                        }
                      />
                    }
                    deleteFunctionality={
                      hideDeleteButton
                        ? undefined
                        : {
                            onDeleteClick: () => handleDeleteClick(index),
                            deleteButtonText: getLanguageFromKey('general.delete', language),
                            deleteIconNode: <i className={'ai ai-trash'} />,
                            popoverPanelIndex,
                            popoverOpen,
                            setPopoverOpen,
                            onPopoverDeleteClick: handlePopoverDeleteClick,
                            onOpenChange,
                            language,
                          }
                    }
                  />
                  {editIndex === index && renderRepeatingGroupsEditContainer()}
                </React.Fragment>
              );
            })}
        </AltinnMobileTable>
      )}
    </Grid>
  );
}

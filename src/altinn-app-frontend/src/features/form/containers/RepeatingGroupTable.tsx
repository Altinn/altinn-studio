import React, { useCallback } from 'react';

import {
  createTheme,
  Grid,
  IconButton,
  makeStyles,
  TableCell,
  TableRow,
  useMediaQuery,
} from '@material-ui/core';
import cn from 'classnames';

import {
  getFormDataForComponentInRepeatingGroup,
  getTextResource,
} from 'src/utils/formComponentUtils';
import { createRepeatingGroupComponents } from 'src/utils/formLayout';
import { setupGroupComponents } from 'src/utils/layout';
import {
  componentHasValidations,
  repeatingGroupHasValidations,
} from 'src/utils/validation';
import type { IFormData } from 'src/features/form/data';
import type {
  ILayout,
  ILayoutComponent,
  ILayoutGroup,
} from 'src/features/form/layout';
import type { IAttachments } from 'src/shared/resources/attachments';
import type {
  IOptions,
  IRepeatingGroups,
  ITextResource,
  ITextResourceBindings,
  IValidations,
} from 'src/types';

import {
  AltinnMobileTable,
  AltinnMobileTableItem,
  AltinnTable,
  AltinnTableBody,
  AltinnTableHeader,
  AltinnTableRow,
} from 'altinn-shared/components';
import altinnAppTheme from 'altinn-shared/theme/altinnAppTheme';
import { getLanguageFromKey, getTextResourceByKey } from 'altinn-shared/utils';
import type { IMobileTableItem } from 'altinn-shared/components/molecules/AltinnMobileTableItem';
import type { ILanguage } from 'altinn-shared/types';

export interface IRepeatingGroupTableProps {
  id: string;
  container: ILayoutGroup;
  components: (ILayoutComponent | ILayoutGroup)[];
  repeatingGroupIndex: number;
  repeatingGroups: IRepeatingGroups;
  repeatingGroupDeepCopyComponents: (ILayoutComponent | ILayoutGroup)[][];
  hiddenFields: string[];
  formData: IFormData;
  attachments: IAttachments;
  options: IOptions;
  textResources: ITextResource[];
  language: ILanguage;
  currentView: string;
  layout: ILayout;
  validations: IValidations;
  editIndex: number;
  setEditIndex: (index: number) => void;
  onClickRemove: (groupIndex: number) => void;
  setMultiPageIndex?: (index: number) => void;
  deleting: boolean;
  hideDeleteButton?: boolean;
  filteredIndexes?: number[];
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
  editButtonCell: {
    padding: '0',
  },
});

function getEditButtonText(
  language: ILanguage,
  isEditing: boolean,
  textResources: ITextResource[],
  textResourceBindings?: ITextResourceBindings,
) {
  if (isEditing && textResourceBindings?.edit_button_close) {
    return getTextResourceByKey(
      textResourceBindings?.edit_button_close,
      textResources,
    );
  } else if (!isEditing && textResourceBindings?.edit_button_open) {
    return getTextResourceByKey(
      textResourceBindings?.edit_button_open,
      textResources,
    );
  }

  return getLanguageFromKey('general.edit_alt', language);
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
  deleting,
  filteredIndexes,
}: IRepeatingGroupTableProps): JSX.Element {
  const classes = useStyles();
  const renderComponents: ILayoutComponent[] = JSON.parse(
    JSON.stringify(components),
  );
  const tableHeaderComponents =
    container.tableHeaders ||
    components.map((c) => (c as any).baseComponentId || c.id) ||
    [];
  const mobileView = useMediaQuery('(max-width:992px)'); // breakpoint on altinn-modal
  const mobileViewSmall = useMediaQuery('(max-width:768px)');
  const componentTitles: string[] = [];
  renderComponents.forEach((component: ILayoutComponent) => {
    const childId = (component as any).baseComponentId || component.id;
    if (tableHeaderComponents.includes(childId)) {
      componentTitles.push(component.textResourceBindings?.title || '');
    }
  });
  const showTableHeader = repeatingGroupIndex > -1;

  const getFormDataForComponent = (
    component: ILayoutComponent | ILayoutGroup,
    index: number,
  ): string => {
    return getFormDataForComponentInRepeatingGroup(
      formData,
      attachments,
      component,
      index,
      container.dataModelBindings.group,
      textResources,
      options,
      repeatingGroups,
    );
  };

  const onClickEdit = (groupIndex: number) => {
    if (groupIndex === editIndex) {
      setEditIndex(-1);
    } else {
      setEditIndex(groupIndex);
    }
  };

  const childElementHasErrors = (
    element: ILayoutGroup | ILayoutComponent,
    index: number,
  ) => {
    if (element.type === 'Group') {
      return childGroupHasErrors(element as ILayoutGroup, index);
    }
    return componentHasValidations(validations, currentView, `${element.id}`);
  };

  const childGroupHasErrors = (childGroup: ILayoutGroup, index: number) => {
    const childGroupIndex = repeatingGroups[childGroup.id]?.index;
    const childGroupComponents = layout.filter(
      (childElement) => childGroup.children?.indexOf(childElement.id) > -1,
    );
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

  const removeClicked = useCallback(
    (index: number) => {
      return async () => {
        onClickRemove(index);
      };
    },
    [onClickRemove],
  );

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
            <AltinnTableHeader id={`group-${id}-table-header`}>
              <TableRow>
                {componentTitles.map((title: string) => (
                  <TableCell
                    align='left'
                    key={title}
                  >
                    {getTextResource(title, textResources)}
                  </TableCell>
                ))}
                <TableCell
                  style={{ width: '110px', padding: 0 }}
                  align='left'
                >
                  <i
                    style={{
                      color: theme.altinnPalette.primary.blueDark,
                      paddingLeft: '14px',
                    }}
                    className={`fa fa-edit ${classes.editIcon}`}
                  />
                </TableCell>
                {!hideDeleteButton && (
                  <TableCell
                    style={{ width: '80px', padding: 0 }}
                    align='left'
                  >
                    <i
                      style={{
                        color: theme.altinnPalette.primary.red,
                        paddingLeft: '9px',
                        paddingBottom: '5px',
                      }}
                      className={'ai ai-trash'}
                    />
                  </TableCell>
                )}
              </TableRow>
            </AltinnTableHeader>
          )}
          <AltinnTableBody id={`group-${id}-table-body`}>
            {repeatingGroupIndex >= 0 &&
              [...Array(repeatingGroupIndex + 1)].map(
                (_x: any, index: number) => {
                  const rowHasErrors = repeatingGroupDeepCopyComponents[
                    index
                  ].some((component: ILayoutComponent | ILayoutGroup) => {
                    return childElementHasErrors(component, index);
                  });

                  // Check if filter is applied and includes specified index.
                  if (filteredIndexes && !filteredIndexes.includes(index)) {
                    return null;
                  }

                  return (
                    <AltinnTableRow
                      valid={!rowHasErrors}
                      key={index}
                    >
                      {components.map((component: ILayoutComponent) => {
                        const childId =
                          (component as any).baseComponentId || component.id;
                        if (!tableHeaderComponents.includes(childId)) {
                          return null;
                        }
                        return (
                          <TableCell key={`${component.id} ${index}`}>
                            {getFormDataForComponent(component, index)}
                          </TableCell>
                        );
                      })}
                      <TableCell
                        align='left'
                        style={{ padding: 0 }}
                        key={`edit-${index}`}
                      >
                        <IconButton
                          className={cn(classes.tableEditButton, {
                            [classes.editButtonActivated]: editIndex === index,
                          })}
                          onClick={() => onClickEdit(index)}
                        >
                          <i
                            className={
                              rowHasErrors
                                ? `ai ai-circle-exclamation a-icon ${classes.errorIcon} ${classes.editIcon}`
                                : `fa fa-edit ${classes.editIcon}`
                            }
                          />
                          {rowHasErrors
                            ? getLanguageFromKey(
                                'general.edit_alt_error',
                                language,
                              )
                            : getEditButtonText(
                                language,
                                editIndex === index,
                                textResources,
                                container.textResourceBindings,
                              )}
                        </IconButton>
                      </TableCell>
                      {!hideDeleteButton && (
                        <TableCell
                          align='left'
                          style={{ padding: 0 }}
                          key={`delete-${index}`}
                        >
                          <IconButton
                            className={classes.deleteButton}
                            disabled={deleting}
                            onClick={removeClicked(index)}
                          >
                            <i className='ai ai-trash' />
                            {getLanguageFromKey('general.delete', language)}
                          </IconButton>
                        </TableCell>
                      )}
                    </AltinnTableRow>
                  );
                },
              )}
          </AltinnTableBody>
        </AltinnTable>
      )}
      {mobileView && (
        <AltinnMobileTable
          id={`group-${id}-table`}
          showBorder={showTableHeader}
        >
          {repeatingGroupIndex >= 0 &&
            [...Array(repeatingGroupIndex + 1)].map(
              (_x: any, index: number) => {
                const rowHasErrors = repeatingGroupDeepCopyComponents[
                  index
                ].some((component: ILayoutComponent | ILayoutGroup) => {
                  return childElementHasErrors(component, index);
                });
                const items: IMobileTableItem[] = [];
                components.forEach((component) => {
                  const childId =
                    (component as any).baseComponentId || component.id;
                  if (tableHeaderComponents.includes(childId)) {
                    items.push({
                      key: component.id,
                      label: getTextResource(
                        component?.textResourceBindings?.title,
                        textResources,
                      ),
                      value: getFormDataForComponent(component, index),
                    });
                  }
                });
                return (
                  <AltinnMobileTableItem
                    key={index}
                    items={items}
                    valid={!rowHasErrors}
                    editIndex={editIndex}
                    onEditClick={() => onClickEdit(index)}
                    onDeleteClick={() => onClickRemove(index)}
                    editIconNode={
                      <>
                        <i
                          className={
                            rowHasErrors
                              ? `ai ai-circle-exclamation ${classes.errorIcon}`
                              : `fa fa-edit ${classes.editIcon}`
                          }
                        />
                        {!mobileViewSmall &&
                          (rowHasErrors
                            ? getLanguageFromKey(
                                'general.edit_alt_error',
                                language,
                              )
                            : getEditButtonText(
                                language,
                                editIndex === index,
                                textResources,
                                container.textResourceBindings,
                              ))}
                      </>
                    }
                    deleteIconNode={
                      !hideDeleteButton && (
                        <>
                          <i className={'ai ai-trash'} />
                          {!mobileViewSmall &&
                            getLanguageFromKey('general.delete', language)}
                        </>
                      )
                    }
                  />
                );
              },
            )}
        </AltinnMobileTable>
      )}
    </Grid>
  );
}

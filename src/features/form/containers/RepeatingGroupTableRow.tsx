import React, { useEffect } from 'react';

import { Button, ButtonColor, ButtonVariant, TableCell, TableRow } from '@altinn/altinn-design-system';
import { createTheme, makeStyles, useMediaQuery } from '@material-ui/core';
import { Delete as DeleteIcon, Edit as EditIcon, ErrorColored as ErrorIcon } from '@navikt/ds-icons';
import cn from 'classnames';

import { DeleteWarningPopover } from 'src/components/molecules/DeleteWarningPopover';
import { ExprDefaultsForGroup } from 'src/features/expressions';
import { useExpressions } from 'src/features/expressions/useExpressions';
import { getLanguageFromKey, getTextResourceByKey } from 'src/language/sharedLanguage';
import altinnAppTheme from 'src/theme/altinnAppTheme';
import { getFormDataForComponentInRepeatingGroup, getTextResource } from 'src/utils/formComponentUtils';
import type { IFormData } from 'src/features/form/data';
import type { ComponentExceptGroup, ILayoutCompInput, ILayoutComponent, ILayoutGroup } from 'src/features/form/layout';
import type { IAttachments } from 'src/shared/resources/attachments';
import type { IOptions, IRepeatingGroups, ITextResource, ITextResourceBindings } from 'src/types';
import type { ILanguage } from 'src/types/shared';

export interface IRepeatingGroupTableRowProps {
  id: string;
  className?: string;
  container: ILayoutGroup;
  components: (ILayoutComponent | ILayoutGroup)[];
  repeatingGroups: IRepeatingGroups | null;
  formData: IFormData;
  attachments: IAttachments;
  options: IOptions;
  textResources: ITextResource[];
  language: ILanguage;
  editIndex: number;
  setEditIndex: (index: number, forceValidation?: boolean) => void;
  onClickRemove: (groupIndex: number) => void;
  deleting: boolean;
  index: number;
  rowHasErrors: boolean;
  tableComponents: ILayoutComponent<ComponentExceptGroup>[];
  setDisplayDeleteColumn: (displayDeleteColumn: boolean) => void;
  onEditClick: () => void;
  mobileView: boolean;
  deleteFunctionality?: {
    popoverOpen: boolean;
    popoverPanelIndex: number;
    onDeleteClick: () => void;
    setPopoverOpen: (open: boolean) => void;
    onOpenChange: (index: number) => void;
    onPopoverDeleteClick: (index: number) => () => void;
  };
}

const theme = createTheme(altinnAppTheme);

const useStyles = makeStyles({
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
  contentFormatting: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    lineClamp: 2,
    WebkitBoxOrient: 'vertical',
    wordBreak: 'break-word',
  },
});

function getTableTitle(textResourceBindings: ITextResourceBindings) {
  if (textResourceBindings.tableTitle) {
    return textResourceBindings.tableTitle;
  }
  if (textResourceBindings.title) {
    return textResourceBindings.title;
  }
  return '';
}

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

export function RepeatingGroupTableRow({
  id,
  className,
  container,
  components,
  editIndex,
  formData,
  attachments,
  options,
  textResources,
  language,
  repeatingGroups,
  deleting,
  index,
  rowHasErrors,
  tableComponents,
  setDisplayDeleteColumn,
  onEditClick,
  mobileView,
  deleteFunctionality,
}: IRepeatingGroupTableRowProps): JSX.Element {
  const classes = useStyles();
  const mobileViewSmall = useMediaQuery('(max-width:768px)');

  const { popoverOpen, popoverPanelIndex, onDeleteClick, setPopoverOpen, onPopoverDeleteClick, onOpenChange } =
    deleteFunctionality || {};

  const edit = useExpressions(container.edit, {
    forComponentId: id,
    rowIndex: index,
    defaults: ExprDefaultsForGroup.edit,
  });

  useEffect(() => {
    if (edit?.deleteButton !== false) {
      setDisplayDeleteColumn(true);
    }
  }, [edit?.deleteButton, setDisplayDeleteColumn]);

  const textResourceBindingsForRow = useExpressions(container.textResourceBindings, {
    forComponentId: id,
    rowIndex: index,
    defaults: ExprDefaultsForGroup.textResourceBindings,
  });

  const componentTextResourceBindings: ITextResourceBindings[] = [];
  tableComponents.forEach((component) => {
    componentTextResourceBindings.push(component.textResourceBindings as ITextResourceBindings);
  });

  const componentTextResourceBindingsResolved = useExpressions(componentTextResourceBindings);

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

  const isEditingRow = index === editIndex;

  const editButtonText = rowHasErrors
    ? getLanguageFromKey('general.edit_alt_error', language)
    : getEditButtonText(language, editIndex === index, textResources, textResourceBindingsForRow);

  const deleteButtonText = getLanguageFromKey('general.delete', language);

  const firstCellData = getFormDataForComponent(components[0], index);

  return (
    <TableRow
      key={`repeating-group-row-${index}`}
      className={cn(
        {
          [classes.tableRowError]: rowHasErrors,
        },
        className,
      )}
    >
      {!mobileView ? (
        tableComponents.map((component: ILayoutComponent) => (
          <TableCell
            key={`${component.id}-${index}`}
            style={{ textAlign: getTextAlignment(component) }}
          >
            <span className={classes.contentFormatting}>
              {!isEditingRow ? getFormDataForComponent(component, index) : null}
            </span>
          </TableCell>
        ))
      ) : (
        <TableCell>
          {tableComponents.map(
            (component: ILayoutComponent, i, { length }) =>
              !isEditingRow && (
                <React.Fragment key={`${component.id}-${index}`}>
                  <b className={classes.contentFormatting}>
                    {getTextResource(getTableTitle(componentTextResourceBindingsResolved[i]), textResources)}:
                  </b>
                  <span className={classes.contentFormatting}>{getFormDataForComponent(component, index)}</span>
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
            colSpan={edit?.deleteButton === false ? 2 : 1}
          >
            <div className={classes.buttonInCellWrapper}>
              <Button
                variant={ButtonVariant.Quiet}
                color={ButtonColor.Secondary}
                icon={rowHasErrors ? <ErrorIcon aria-hidden='true' /> : <EditIcon aria-hidden='true' />}
                iconPlacement='right'
                onClick={onEditClick}
                aria-label={`${editButtonText}-${firstCellData}`}
                data-testid='edit-button'
                className={classes.tableButton}
              >
                {editButtonText}
              </Button>
            </div>
          </TableCell>
          {edit?.deleteButton !== false &&
            setPopoverOpen &&
            onOpenChange &&
            onPopoverDeleteClick &&
            typeof popoverOpen === 'boolean' && (
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
                        onClick={onDeleteClick}
                        aria-label={`${deleteButtonText}-${firstCellData}`}
                        data-testid='delete-button'
                        className={classes.tableButton}
                      >
                        {deleteButtonText}
                      </Button>
                    }
                    side='left'
                    language={language}
                    deleteButtonText={getLanguageFromKey('group.row_popover_delete_button_confirm', language)}
                    messageText={getLanguageFromKey('group.row_popover_delete_message', language)}
                    open={popoverPanelIndex == index && popoverOpen}
                    setPopoverOpen={setPopoverOpen}
                    onCancelClick={() => onOpenChange(index)}
                    onPopoverDeleteClick={onPopoverDeleteClick(index)}
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
              onClick={onEditClick}
              aria-label={`${editButtonText}-${firstCellData}`}
              data-testid='edit-button'
              className={classes.tableButton}
            >
              {(isEditingRow || !mobileViewSmall) && editButtonText}
            </Button>
            {edit?.deleteButton !== false &&
              setPopoverOpen &&
              onOpenChange &&
              onPopoverDeleteClick &&
              typeof popoverOpen === 'boolean' && (
                <>
                  <div style={{ height: 8 }} />
                  <DeleteWarningPopover
                    trigger={
                      <Button
                        variant={ButtonVariant.Quiet}
                        color={ButtonColor.Danger}
                        icon={<DeleteIcon aria-hidden='true' />}
                        iconPlacement='right'
                        disabled={deleting}
                        onClick={onDeleteClick}
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
                    onPopoverDeleteClick={onPopoverDeleteClick(index)}
                  />
                </>
              )}
          </div>
        </TableCell>
      )}
    </TableRow>
  );
}

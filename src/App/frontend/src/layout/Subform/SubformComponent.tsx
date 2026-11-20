import { useNavigation } from 'react-router';
import type { JSX, KeyboardEvent } from 'react';

import { BaseTable, Button, FatalError, Flex, Spinner } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';
import { PencilIcon, PlusIcon, TrashIcon } from '@navikt/aksel-icons';
import cn from 'classnames';

import { Caption } from 'src/components/form/caption/Caption';
import { useIsAnyProcessing, useIsThisProcessing, useProcessingMutation } from 'src/core/queries/processing';
import { useAddEntryMutation, useDeleteEntryMutation } from 'src/core/queries/subform';
import { FormStore } from 'src/features/form/FormContext';
import { getDefaultDataTypeFromUiFolder } from 'src/features/form/ui';
import { useInstanceDataElements } from 'src/features/instance/InstanceContext';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { isSubformValidation } from 'src/features/validation';
import { useComponentValidationsFor } from 'src/features/validation/selectors/componentValidationsForNode';
import { useIsSubformPage } from 'src/hooks/navigation';
import { useEnterSubform } from 'src/hooks/useNavigatePage';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { ComponentErrorList } from 'src/layout/GenericComponent';
import { SubformCellContent } from 'src/layout/Subform/SubformCellContent';
import classes from 'src/layout/Subform/SubformComponent.module.css';
import { evalSubformString, useExpressionDataSourcesForSubform, useSubformFormData } from 'src/layout/Subform/utils';
import utilClasses from 'src/styles/utils.module.css';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalOptionalText } from 'src/utils/layout/useEvalExpression';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IData } from 'src/types/shared';

export function SubformComponent({ baseComponentId }: PropsFromGenericComponent<'Subform'>): JSX.Element | null {
  const config = useComponentConfig(baseComponentId, 'Subform');
  const componentId = useIndexedId(baseComponentId);
  const title = useEvalOptionalText(config.textResourceBindings?.title, Expressions.Subform.textResourceBindings.title);
  const description = useEvalOptionalText(
    config.textResourceBindings?.description,
    Expressions.Subform.textResourceBindings.description,
  );
  const help = useEvalOptionalText(config.textResourceBindings?.help, Expressions.Subform.textResourceBindings.help);
  const addButton = useEvalOptionalText(
    config.textResourceBindings?.addButton,
    Expressions.Subform.textResourceBindings.addButton,
  );

  const isSubformPage = useIsSubformPage();
  const dataType = getDefaultDataTypeFromUiFolder(config.layoutSet);
  const navigation = useNavigation();

  if (!dataType) {
    window.logErrorOnce(`Unable to find data type for subform with id ${componentId}`);
    throw new Error(`Unable to find data type for subform with id ${componentId}`);
  }

  const { langAsString } = useLanguage();
  const addSubformEntryMutation = useAddEntryMutation(dataType);
  const subformEntries = useInstanceDataElements(dataType);

  const enterSubform = useEnterSubform();
  const lock = FormStore.data.useLocking(componentId);
  const performProcess = useProcessingMutation('add-subform');
  const isAdding = useIsThisProcessing('add-subform');
  const instanceLocked = FormStore.useIsInstanceLocked();
  const isAddingDisabled = useIsAnyProcessing() || instanceLocked;
  const nodeId = useIndexedId(baseComponentId);

  const subformIdsWithError =
    useComponentValidationsFor(baseComponentId).find(isSubformValidation)?.subformDataElementIds;

  const addEntry = () =>
    performProcess(async () => {
      // Adding an entry writes to the instance, which is locked
      if (instanceLocked) {
        return;
      }
      const currentLock = await lock();
      try {
        const result = await addSubformEntryMutation.mutateAsync({});
        enterSubform({ nodeId, dataElementId: result.id });
      } catch {
        // NOTE: Handled by useAddEntryMutation
      } finally {
        currentLock.unlock();
      }
    });

  if (isSubformPage && navigation.state !== 'loading') {
    return (
      <ComponentErrorList
        baseComponentId={baseComponentId}
        errors={['Cannot use a SubformComponent component within a subform']}
      />
    );
  }

  return (
    <ComponentStructureWrapper baseComponentId={baseComponentId}>
      <Flex
        id={componentId}
        container
        item
        data-componentid={componentId}
        data-componentbaseid={baseComponentId}
      >
        <BaseTable
          id={`subform-${componentId}-table`}
          className={classes.subformTable}
          headerBackground='gray'
          headerDivider='light'
          headerPadding='large'
          rowDivider='light'
          cellPadding='medium'
        >
          {title && (
            <Caption
              id={`subform-${componentId}-caption`}
              title={<Lang id={title} />}
              description={description && <Lang id={description} />}
              helpText={
                help
                  ? {
                      text: <Lang id={help} />,
                      accessibleTitle: title,
                    }
                  : undefined
              }
            />
          )}
          {subformEntries.length > 0 && (
            <>
              <BaseTable.Head id={`subform-${componentId}-table-body`}>
                <BaseTable.Row>
                  {(config.tableColumns ?? []).length ? (
                    (config.tableColumns ?? []).map((entry, index) => (
                      <BaseTable.HeaderCell
                        columnWidth
                        key={index}
                      >
                        <Lang id={entry.headerContent} />
                      </BaseTable.HeaderCell>
                    ))
                  ) : (
                    <BaseTable.HeaderCell columnWidth>
                      <Lang id='form_filler.subform_default_header' />
                    </BaseTable.HeaderCell>
                  )}
                  <BaseTable.HeaderCell>
                    <span className={utilClasses.visuallyHidden}>
                      <Lang id='general.edit' />
                    </span>
                  </BaseTable.HeaderCell>
                  {(config.showDeleteButton ?? true) && (
                    <BaseTable.HeaderCell>
                      <span className={utilClasses.visuallyHidden}>
                        <Lang id='general.delete' />
                      </span>
                    </BaseTable.HeaderCell>
                  )}
                </BaseTable.Row>
              </BaseTable.Head>
              <BaseTable.Body>
                {subformEntries.map((dataElement, index) => (
                  <SubformTableRow
                    key={dataElement.id}
                    dataElement={dataElement}
                    baseComponentId={baseComponentId}
                    hasErrors={Boolean(subformIdsWithError?.includes(dataElement.id))}
                    rowNumber={index}
                    showDeleteButton={config.showDeleteButton ?? true}
                  />
                ))}
              </BaseTable.Body>
            </>
          )}
        </BaseTable>

        {(config.showAddButton ?? true) && (
          <div className={classes.addButton}>
            <Button
              id={`subform-${componentId}-add-button`}
              size='md'
              disabled={isAddingDisabled}
              isLoading={isAdding}
              loadingLabel={langAsString('general.loading')}
              onClick={async () => await addEntry()}
              onKeyUp={async (event: KeyboardEvent<HTMLButtonElement>) => {
                const allowedKeys = ['enter', ' ', 'spacebar'];
                if (allowedKeys.includes(event.key.toLowerCase())) {
                  await addEntry();
                }
              }}
              variant='secondary'
              fullWidth
            >
              {!isAdding && (
                <PlusIcon
                  fontSize='1.5rem'
                  aria-hidden='true'
                />
              )}
              {langAsString(addButton)}
            </Button>
          </div>
        )}
      </Flex>
    </ComponentStructureWrapper>
  );
}

function SubformTableRow({
  dataElement,
  baseComponentId,
  hasErrors,
  rowNumber,
  showDeleteButton,
}: {
  dataElement: IData;
  baseComponentId: string;
  hasErrors: boolean;
  rowNumber: number;
  showDeleteButton: boolean;
}) {
  const id = dataElement.id;
  const config = useComponentConfig(baseComponentId, 'Subform');

  const component = useComponentConfig(baseComponentId, 'Subform');
  const { isSubformDataFetching, subformData, subformDataError } = useSubformFormData(dataElement.id);

  const subformDataSources = useExpressionDataSourcesForSubform(dataElement.dataType, subformData);
  const editButtonDataSource = useExpressionDataSourcesForSubform(dataElement.dataType, subformData);

  const { langAsString } = useLanguage();
  const enterSubform = useEnterSubform();

  const { mutate: deleteSubformEntry, isPending: isDeleting } = useDeleteEntryMutation();
  const deleteButtonText = langAsString('general.delete');
  const instanceLocked = FormStore.useIsInstanceLocked();

  const editButtonText = component?.textResourceBindings?.tableEditButton
    ? langAsString(evalSubformString(component.textResourceBindings.tableEditButton, editButtonDataSource))
    : langAsString('general.edit');
  const nodeId = useIndexedId(baseComponentId);

  const numColumns = (config.tableColumns ?? []).length;
  const actualColumns = showDeleteButton ? numColumns + 1 : numColumns;

  if (isSubformDataFetching) {
    return (
      <BaseTable.Row>
        <BaseTable.Cell colSpan={actualColumns}>
          <Spinner aria-label={langAsString('general.loading')} />
        </BaseTable.Cell>
      </BaseTable.Row>
    );
  } else if (subformDataError) {
    return (
      <BaseTable.Row>
        <BaseTable.Cell colSpan={actualColumns}>
          <FatalError>
            <Lang id='form_filler.error_fetch_subform' />
          </FatalError>
        </BaseTable.Cell>
      </BaseTable.Row>
    );
  }

  return (
    <BaseTable.Row
      key={`subform-row-${id}`}
      data-row-num={rowNumber}
      error={hasErrors}
      className={cn({ [classes.disabledRow]: isDeleting })}
    >
      {(config.tableColumns ?? []).length ? (
        (config.tableColumns ?? []).map((entry, index) => (
          <BaseTable.Cell key={`subform-cell-${id}-${index}`}>
            <SubformCellContent
              cellContent={entry.cellContent}
              baseComponentId={baseComponentId}
              data={subformData}
              dataSources={subformDataSources}
            />
          </BaseTable.Cell>
        ))
      ) : (
        <BaseTable.Cell key={`subform-cell-${id}-0`}>{String(id)}</BaseTable.Cell>
      )}
      <BaseTable.ButtonCell>
        <Button
          disabled={isDeleting || instanceLocked}
          variant='tertiary'
          color='second'
          onClick={async () => enterSubform({ nodeId, dataElementId: id, validate: hasErrors })}
          aria-label={editButtonText}
          className={classes.tableButton}
        >
          {editButtonText}
          <PencilIcon
            fontSize='1rem'
            aria-hidden='true'
          />
        </Button>
      </BaseTable.ButtonCell>
      {showDeleteButton && (
        <BaseTable.ButtonCell>
          <Button
            disabled={isDeleting || instanceLocked}
            variant='tertiary'
            color='danger'
            onClick={() => {
              // Deleting an entry writes to the instance, which is locked
              if (!instanceLocked) {
                deleteSubformEntry(id);
              }
            }}
            aria-label={deleteButtonText}
            className={classes.tableButton}
          >
            {deleteButtonText}
            <TrashIcon
              fontSize='1rem'
              aria-hidden='true'
            />
          </Button>
        </BaseTable.ButtonCell>
      )}
    </BaseTable.Row>
  );
}

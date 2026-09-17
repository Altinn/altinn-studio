import React from 'react';
import { useNavigation } from 'react-router';

import { Button, FatalError, Flex, Spinner } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';
import { Table } from '@digdir/designsystemet-react';
import { PencilIcon, PlusIcon, TrashIcon } from '@navikt/aksel-icons';
import cn from 'classnames';

import { Caption } from 'src/components/form/caption/Caption';
import { FormStore } from 'src/features/form/FormContext';
import { getDefaultDataTypeFromUiFolder } from 'src/features/form/ui';
import { useInstanceDataElements } from 'src/features/instance/InstanceContext';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useAddEntryMutation, useDeleteEntryMutation } from 'src/features/subformData/useSubformMutations';
import { isSubformValidation } from 'src/features/validation';
import { useComponentValidationsFor } from 'src/features/validation/selectors/componentValidationsForNode';
import { useIsSubformPage } from 'src/hooks/navigation';
import { useEnterSubform } from 'src/hooks/useNavigatePage';
import { useIsAnyProcessing, useIsThisProcessing, useProcessingMutation } from 'src/hooks/useProcessingMutation';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { ComponentErrorList } from 'src/layout/GenericComponent';
import { SubformCellContent } from 'src/layout/Subform/SubformCellContent';
import classes from 'src/layout/Subform/SubformComponent.module.css';
import { evalSubformString, useExpressionDataSourcesForSubform, useSubformFormData } from 'src/layout/Subform/utils';
import utilClasses from 'src/styles/utils.module.css';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IData } from 'src/types/shared';

export function SubformComponent({ baseComponentId }: PropsFromGenericComponent<'Subform'>): React.JSX.Element | null {
  const config = useComponentConfig(baseComponentId, 'Subform');
  const componentId = useIndexedId(baseComponentId);
  const title = useEvalExpression(config.textResourceBindings?.title, Expressions.Subform.textResourceBindings.title);
  const description = useEvalExpression(
    config.textResourceBindings?.description,
    Expressions.Subform.textResourceBindings.description,
  );
  const help = useEvalExpression(config.textResourceBindings?.help, Expressions.Subform.textResourceBindings.help);
  const addButton = useEvalExpression(
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
  const isAddingDisabled = useIsAnyProcessing();
  const nodeId = useIndexedId(baseComponentId);

  const subformIdsWithError =
    useComponentValidationsFor(baseComponentId).find(isSubformValidation)?.subformDataElementIds;

  const addEntry = () =>
    performProcess(async () => {
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
        <Table
          id={`subform-${componentId}-table`}
          className={classes.subformTable}
        >
          {(config.textResourceBindings?.title === undefined ? undefined : title) && (
            <Caption
              id={`subform-${componentId}-caption`}
              title={<Lang id={config.textResourceBindings?.title === undefined ? undefined : title} />}
              description={
                (config.textResourceBindings?.description === undefined ? undefined : description) && (
                  <Lang id={config.textResourceBindings?.description === undefined ? undefined : description} />
                )
              }
              helpText={
                (config.textResourceBindings?.help === undefined ? undefined : help)
                  ? {
                      text: <Lang id={config.textResourceBindings?.help === undefined ? undefined : help} />,
                      accessibleTitle: config.textResourceBindings?.title === undefined ? undefined : title,
                    }
                  : undefined
              }
            />
          )}
          {subformEntries.length > 0 && (
            <>
              <Table.Head id={`subform-${componentId}-table-body`}>
                <Table.Row>
                  {(config.tableColumns ?? []).length ? (
                    (config.tableColumns ?? []).map((entry, index) => (
                      <Table.HeaderCell
                        className={classes.tableCellFormatting}
                        key={index}
                      >
                        <Lang id={entry.headerContent} />
                      </Table.HeaderCell>
                    ))
                  ) : (
                    <Table.HeaderCell className={classes.tableCellFormatting}>
                      <Lang id='form_filler.subform_default_header' />
                    </Table.HeaderCell>
                  )}
                  <Table.HeaderCell>
                    <span className={utilClasses.visuallyHidden}>
                      <Lang id='general.edit' />
                    </span>
                  </Table.HeaderCell>
                  {(config.showDeleteButton ?? true) && (
                    <Table.HeaderCell>
                      <span className={utilClasses.visuallyHidden}>
                        <Lang id='general.delete' />
                      </span>
                    </Table.HeaderCell>
                  )}
                </Table.Row>
              </Table.Head>
              <Table.Body>
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
              </Table.Body>
            </>
          )}
        </Table>

        {(config.showAddButton ?? true) && (
          <div className={classes.addButton}>
            <Button
              id={`subform-${componentId}-add-button`}
              size='md'
              disabled={isAddingDisabled}
              isLoading={isAdding}
              loadingLabel={langAsString('general.loading')}
              onClick={async () => await addEntry()}
              onKeyUp={async (event: React.KeyboardEvent<HTMLButtonElement>) => {
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
              {langAsString(config.textResourceBindings?.addButton === undefined ? undefined : addButton)}
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

  const editButtonText = component?.textResourceBindings?.tableEditButton
    ? langAsString(evalSubformString(component.textResourceBindings.tableEditButton, editButtonDataSource))
    : langAsString('general.edit');
  const nodeId = useIndexedId(baseComponentId);

  const numColumns = (config.tableColumns ?? []).length;
  const actualColumns = showDeleteButton ? numColumns + 1 : numColumns;

  if (isSubformDataFetching) {
    return (
      <Table.Row>
        <Table.Cell colSpan={actualColumns}>
          <Spinner aria-label={langAsString('general.loading')} />
        </Table.Cell>
      </Table.Row>
    );
  } else if (subformDataError) {
    return (
      <Table.Row>
        <Table.Cell colSpan={actualColumns}>
          <FatalError>
            <Lang id='form_filler.error_fetch_subform' />
          </FatalError>
        </Table.Cell>
      </Table.Row>
    );
  }

  return (
    <Table.Row
      key={`subform-row-${id}`}
      data-row-num={rowNumber}
      className={cn({ [classes.disabledRow]: isDeleting, [classes.tableRowError]: hasErrors })}
    >
      {(config.tableColumns ?? []).length ? (
        (config.tableColumns ?? []).map((entry, index) => (
          <Table.Cell key={`subform-cell-${id}-${index}`}>
            <SubformCellContent
              cellContent={entry.cellContent}
              baseComponentId={baseComponentId}
              data={subformData}
              dataSources={subformDataSources}
            />
          </Table.Cell>
        ))
      ) : (
        <Table.Cell key={`subform-cell-${id}-0`}>{String(id)}</Table.Cell>
      )}
      <Table.Cell className={classes.buttonCell}>
        <div className={classes.buttonInCellWrapper}>
          <Button
            disabled={isDeleting}
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
        </div>
      </Table.Cell>
      {showDeleteButton && (
        <Table.Cell className={classes.buttonCell}>
          <div className={classes.buttonInCellWrapper}>
            <Button
              disabled={isDeleting}
              variant='tertiary'
              color='danger'
              onClick={() => deleteSubformEntry(id)}
              aria-label={deleteButtonText}
              className={classes.tableButton}
            >
              {deleteButtonText}
              <TrashIcon
                fontSize='1rem'
                aria-hidden='true'
              />
            </Button>
          </div>
        </Table.Cell>
      )}
    </Table.Row>
  );
}

import React, { useLayoutEffect, useState } from 'react';

import { Expressions } from '@app/layout-contract/generated/expressions.generated';
import { ChevronDownIcon } from '@navikt/aksel-icons';
import cn from 'classnames';

import { FormStore } from 'src/features/form/FormContext';
import { getDefaultDataTypeFromUiFolder } from 'src/features/form/ui';
import { useInstanceDataElements } from 'src/features/instance/InstanceContext';
import { Lang } from 'src/features/language/Lang';
import classes from 'src/features/navigation/components/SubformsForPage.module.css';
import { isSubformValidation } from 'src/features/validation';
import { useComponentValidationsFor } from 'src/features/validation/selectors/componentValidationsForNode';
import { useNavigationParam } from 'src/hooks/navigation';
import { useEnterSubform } from 'src/hooks/useNavigatePage';
import { useIsAnyProcessing } from 'src/hooks/useProcessingMutation';
import {
  getSubformEntryDisplayName,
  useExpressionDataSourcesForSubform,
  useSubformFormData,
} from 'src/layout/Subform/utils';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';
import type { ExprVal, ExprValToActualOrExpr } from 'src/features/expressions/types';
import type { IData } from 'src/types/shared';

export function SubformsForPage({ pageKey, expandedByDefault }: { pageKey: string; expandedByDefault?: boolean }) {
  const lookups = FormStore.bootstrap.useLayoutLookups();
  const subformIds = lookups.topLevelComponents[pageKey]?.filter((id) => lookups.allComponents[id]?.type === 'Subform');
  if (!subformIds?.length) {
    return null;
  }

  return subformIds.map((baseId) => (
    <SubformGroup
      key={baseId}
      baseId={baseId}
      expandedByDefault={expandedByDefault}
    />
  ));
}

function SubformGroup({ baseId, expandedByDefault }: { baseId: string; expandedByDefault?: boolean }) {
  const currentPageId = useNavigationParam('pageKey');
  const pageKey = FormStore.bootstrap.useLayoutLookups().componentToPage[baseId];
  if (!pageKey) {
    throw new Error(`Unable to find page for subform with id ${baseId}`);
  }

  const isCurrentPage = pageKey === currentPageId;
  const [isOpen, setIsOpen] = useState(isCurrentPage || !!expandedByDefault);
  useLayoutEffect(() => setIsOpen(isCurrentPage || !!expandedByDefault), [isCurrentPage, expandedByDefault]);

  const subformIdsWithError = useComponentValidationsFor(baseId).find(isSubformValidation)?.subformDataElementIds;
  const config = useComponentConfig(baseId, 'Subform');

  const title = useEvalExpression(config.textResourceBindings?.title, Expressions.Subform.textResourceBindings.title);
  const dataType = getDefaultDataTypeFromUiFolder(config.layoutSet);
  if (!dataType) {
    throw new Error(`Unable to find data type for subform with id ${baseId}`);
  }
  const dataElements = useInstanceDataElements(dataType);

  if (!dataElements.length || !config.entryDisplayName) {
    return null;
  }

  const buttonId = `navigation-button-${dataType}`;
  const listId = `navigation-subform-list-${dataType}`;

  return (
    <div className={classes.subformContainer}>
      <button
        id={buttonId}
        aria-expanded={isOpen}
        aria-owns={listId}
        onClick={() => setIsOpen((o) => !o)}
        className={cn(classes.subformExpandButton, 'fds-focus')}
      >
        <span className={classes.subformGroupName}>
          <Lang id={title} />
          &nbsp;({dataElements.length})
        </span>
        <ChevronDownIcon
          aria-hidden
          className={cn(classes.subformExpandChevron, { [classes.subformExpandChevronOpen]: isOpen })}
        />
      </button>
      <ul
        id={listId}
        aria-labelledby={buttonId}
        style={!isOpen ? { display: 'none' } : undefined}
        className={cn(classes.subformList)}
      >
        {dataElements.map((dataElement) => (
          <SubformLink
            key={dataElement.id}
            page={pageKey}
            entryDisplayName={config.entryDisplayName}
            nodeId={baseId}
            dataElement={dataElement}
            hasErrors={Boolean(subformIdsWithError?.includes(dataElement.id))}
          />
        ))}
      </ul>
    </div>
  );
}

function SubformLink({
  page,
  entryDisplayName,
  nodeId,
  dataElement,
  hasErrors,
}: {
  page: string;
  entryDisplayName: ExprValToActualOrExpr<ExprVal.String> | undefined;
  nodeId: string;
  dataElement: IData;
  hasErrors: boolean;
}) {
  const disabled = useIsAnyProcessing();
  const enterSubform = useEnterSubform();
  const { isSubformDataFetching, subformData, subformDataError } = useSubformFormData(dataElement.id);
  const subformDataSources = useExpressionDataSourcesForSubform(dataElement.dataType, subformData);

  const subformEntryName =
    !isSubformDataFetching && !subformDataError
      ? getSubformEntryDisplayName(entryDisplayName, subformDataSources, nodeId)
      : null;

  if (!subformEntryName) {
    return null;
  }

  return (
    <li>
      <button
        disabled={disabled}
        className={cn(classes.subformLink, 'fds-focus')}
        onClick={() => enterSubform({ nodeId, dataElementId: dataElement.id, page, validate: hasErrors })}
      >
        <span className={classes.subformLinkName}>{subformEntryName}</span>
      </button>
    </li>
  );
}

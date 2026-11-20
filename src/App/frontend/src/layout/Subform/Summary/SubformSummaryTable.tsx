import { useNavigate, useNavigation } from 'react-router';
import type React from 'react';

import { BaseTable, FatalError, Flex, Spinner } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';
import { Paragraph } from '@digdir/designsystemet-react';
import classNames from 'classnames';

import { Caption } from 'src/components/form/caption/Caption';
import { Label } from 'src/components/label/Label';
import { FormStore } from 'src/features/form/FormContext';
import { getDefaultDataTypeFromUiFolder } from 'src/features/form/ui';
import { useInstanceDataElements } from 'src/features/instance/InstanceContext';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { usePdfModeActive } from 'src/features/pdf/PdfWrapper';
import { isSubformValidation } from 'src/features/validation';
import { useComponentValidationsFor } from 'src/features/validation/selectors/componentValidationsForNode';
import { useAllNavigationParams, useIsSubformPage } from 'src/hooks/navigation';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { ComponentErrorList } from 'src/layout/GenericComponent';
import { SubformCellContent } from 'src/layout/Subform/SubformCellContent';
import classes1 from 'src/layout/Subform/SubformComponent.module.css';
import classes2 from 'src/layout/Subform/Summary/SubformSummaryComponent2.module.css';
import { useExpressionDataSourcesForSubform, useSubformFormData } from 'src/layout/Subform/utils';
import { EditButton } from 'src/layout/Summary2/CommonSummaryComponents/EditButton';
import {
  useSummaryCaptionProps,
  useSummaryLabelText,
} from 'src/layout/Summary2/CommonSummaryComponents/useSummaryLabelText';
import utilClasses from 'src/styles/utils.module.css';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalOptionalText } from 'src/utils/layout/useEvalExpression';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';
import type { IData } from 'src/types/shared';

function SubformTableRow({
  dataElement,
  baseComponentId,
  hasErrors,
  rowNumber,
  pdfModeActive,
}: {
  dataElement: IData;
  baseComponentId: string;
  hasErrors: boolean;
  rowNumber: number;
  pdfModeActive: boolean;
}) {
  const id = dataElement.id;
  const page = FormStore.bootstrap.useLayoutLookups().componentToPage[baseComponentId] ?? 'unknown';
  const config = useComponentConfig(baseComponentId, 'Subform');
  const nodeId = useIndexedId(baseComponentId);
  const { instanceOwnerPartyId, instanceGuid, taskId } = useAllNavigationParams();

  const { isSubformDataFetching, subformData, subformDataError } = useSubformFormData(dataElement.id);
  const subformDataSources = useExpressionDataSourcesForSubform(dataElement.dataType, subformData);

  const { langAsString } = useLanguage();
  const navigate = useNavigate();

  if (isSubformDataFetching) {
    return (
      <BaseTable.Row>
        <BaseTable.Cell colSpan={config.tableColumns.length}>
          <Spinner aria-label={langAsString('general.loading')} />
        </BaseTable.Cell>
      </BaseTable.Row>
    );
  } else if (subformDataError) {
    return (
      <BaseTable.Row>
        <BaseTable.Cell colSpan={config.tableColumns.length}>
          <FatalError>
            <Lang id='form_filler.error_fetch_subform' />
          </FatalError>
        </BaseTable.Cell>
      </BaseTable.Row>
    );
  }

  const url = `/instance/${instanceOwnerPartyId}/${instanceGuid}/${taskId}/${page}/${nodeId}/${dataElement.id}${hasErrors ? '?validate=true' : ''}`;

  return (
    <BaseTable.Row
      key={`subform-row-${id}`}
      data-row-num={rowNumber}
      error={!pdfModeActive && hasErrors}
    >
      {config.tableColumns.length ? (
        config.tableColumns.map((entry, index) => (
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
      {!pdfModeActive && (
        <BaseTable.Cell className={classes2.noRightPad}>
          <EditButton
            className={classes2.marginLeftAuto}
            targetBaseComponentId={baseComponentId}
            navigationOverride={() => navigate(url)}
          />
        </BaseTable.Cell>
      )}
    </BaseTable.Row>
  );
}

export function SubformSummaryTable({
  targetBaseComponentId,
}: Pick<Summary2Props, 'targetBaseComponentId'>): React.JSX.Element | null {
  const config = useComponentConfig(targetBaseComponentId, 'Subform');
  const componentId = useIndexedId(targetBaseComponentId);
  const summaryTitle = useEvalOptionalText(
    config.textResourceBindings?.summaryTitle,
    Expressions.Subform.textResourceBindings.summaryTitle,
  );
  const resolvedTitle = useEvalOptionalText(
    config.textResourceBindings?.title,
    Expressions.Subform.textResourceBindings.title,
  );
  const title = summaryTitle ?? resolvedTitle;
  const labelText = useSummaryLabelText(targetBaseComponentId);
  const captionProps = useSummaryCaptionProps(targetBaseComponentId, title);

  const navigation = useNavigation();

  const isSubformPage = useIsSubformPage();
  const dataType = getDefaultDataTypeFromUiFolder(config.layoutSet);
  const subformIdsWithError =
    useComponentValidationsFor(targetBaseComponentId).find(isSubformValidation)?.subformDataElementIds;

  if (!dataType) {
    window.logErrorOnce(`Unable to find data type for subform with id ${componentId}`);
    throw new Error(`Unable to find data type for subform with id ${componentId}`);
  }

  const pdfModeActive = usePdfModeActive();
  const dataElements = useInstanceDataElements(dataType);

  if (isSubformPage && navigation.state !== 'loading') {
    return (
      <ComponentErrorList
        baseComponentId={targetBaseComponentId}
        errors={['Cannot use a SubformComponent component within a subform']}
      />
    );
  }

  if (dataElements.length == 0) {
    return (
      <>
        <Label
          baseComponentId={targetBaseComponentId}
          id={`subform-summary2-${componentId}`}
          renderLabelAs='span'
          hideIndicators
          weight='regular'
          textResourceBindings={{
            ...labelText,
            title,
          }}
          className={classes2.summaryLabelMargin}
        />
        <Paragraph asChild>
          <span className={classes2.emptyField}>
            <Lang id='general.empty_summary' />
          </span>
        </Paragraph>
      </>
    );
  }

  return (
    <ComponentStructureWrapper baseComponentId={targetBaseComponentId}>
      <Flex
        id={componentId}
        container
        item
        data-componentid={componentId}
        data-componentbaseid={targetBaseComponentId}
      >
        <BaseTable
          id={`subform-${componentId}-table`}
          className={classes1.subformTable}
          headerBackground='gray'
          headerDivider='light'
          headerPadding='large'
          rowDivider='light'
          cellPadding='medium'
        >
          {title && (
            <Caption
              {...captionProps}
              id={`subform-${componentId}-caption`}
              title={<Lang id={title} />}
            />
          )}
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
              {!pdfModeActive && (
                <BaseTable.HeaderCell className={classNames(classes2.editColumnHeader, classes2.noRightPad)}>
                  <span className={utilClasses.visuallyHidden}>
                    <Lang id='general.edit' />
                  </span>
                </BaseTable.HeaderCell>
              )}
            </BaseTable.Row>
          </BaseTable.Head>
          <BaseTable.Body>
            {dataElements.map((dataElement, index) => (
              <SubformTableRow
                key={dataElement.id}
                dataElement={dataElement}
                baseComponentId={targetBaseComponentId}
                hasErrors={Boolean(subformIdsWithError?.includes(dataElement.id))}
                rowNumber={index}
                pdfModeActive={pdfModeActive}
              />
            ))}
          </BaseTable.Body>
        </BaseTable>
      </Flex>
    </ComponentStructureWrapper>
  );
}

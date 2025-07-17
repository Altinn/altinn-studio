import React from 'react';
import { useNavigate, useNavigation } from 'react-router-dom';

import { Paragraph, Spinner, Table } from '@digdir/designsystemet-react';
import classNames from 'classnames';

import { Flex } from 'src/app-components/Flex/Flex';
import { Caption } from 'src/components/form/caption/Caption';
import { Label } from 'src/components/label/Label';
import { useDataTypeFromLayoutSet, useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { useStrictDataElements } from 'src/features/instance/InstanceContext';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { usePdfModeActive } from 'src/features/pdf/PDFWrapper';
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
import utilClasses from 'src/styles/utils.module.css';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
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
  const page = useLayoutLookups().componentToPage[baseComponentId] ?? 'unknown';
  const { id: nodeId, tableColumns } = useItemWhenType(baseComponentId, 'Subform');
  const { instanceOwnerPartyId, instanceGuid, taskId } = useAllNavigationParams();

  const { isSubformDataFetching, subformData, subformDataError } = useSubformFormData(dataElement.id);
  const subformDataSources = useExpressionDataSourcesForSubform(dataElement.dataType, subformData, tableColumns);

  const { langAsString } = useLanguage();
  const navigate = useNavigate();

  const numColumns = tableColumns.length;
  if (isSubformDataFetching) {
    return (
      <Table.Row>
        <Table.Cell colSpan={numColumns}>
          <Spinner aria-label={langAsString('general.loading')} />
        </Table.Cell>
      </Table.Row>
    );
  } else if (subformDataError) {
    return (
      <Table.Row>
        <Table.Cell colSpan={numColumns}>
          <Lang id='form_filler.error_fetch_subform' />
        </Table.Cell>
      </Table.Row>
    );
  }

  const url = `/instance/${instanceOwnerPartyId}/${instanceGuid}/${taskId}/${page}/${nodeId}/${dataElement.id}${hasErrors ? '?validate=true' : ''}`;

  return (
    <Table.Row
      key={`subform-row-${id}`}
      data-row-num={rowNumber}
      className={classNames({ [classes1.tableRowError]: !pdfModeActive && hasErrors })}
    >
      {tableColumns.length ? (
        tableColumns.map((entry, index) => (
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
      {!pdfModeActive && (
        <Table.Cell className={classes2.noRightPad}>
          <EditButton
            className={classes2.marginLeftAuto}
            targetBaseComponentId={baseComponentId}
            navigationOverride={() => navigate(url)}
          />
        </Table.Cell>
      )}
    </Table.Row>
  );
}

export function SubformSummaryTable({
  targetBaseComponentId,
}: Pick<Summary2Props, 'targetBaseComponentId'>): React.JSX.Element | null {
  const { id, layoutSet, textResourceBindings, tableColumns = [] } = useItemWhenType(targetBaseComponentId, 'Subform');
  const navigation = useNavigation();

  const isSubformPage = useIsSubformPage();
  const dataType = useDataTypeFromLayoutSet(layoutSet);
  const subformIdsWithError =
    useComponentValidationsFor(targetBaseComponentId).find(isSubformValidation)?.subformDataElementIds;

  if (!dataType) {
    window.logErrorOnce(`Unable to find data type for subform with id ${id}`);
    throw new Error(`Unable to find data type for subform with id ${id}`);
  }

  const pdfModeActive = usePdfModeActive();
  const dataElements = useStrictDataElements(dataType);

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
          id={`subform-summary2-${id}`}
          renderLabelAs='span'
          weight='regular'
          textResourceBindings={{ title: textResourceBindings?.title }}
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
        id={id}
        container
        item
        data-componentid={id}
        data-componentbaseid={targetBaseComponentId}
      >
        <Table
          id={`subform-${id}-table`}
          className={classes1.subformTable}
        >
          <Caption
            id={`subform-${id}-caption`}
            title={<Lang id={textResourceBindings?.title} />}
            description={textResourceBindings?.description && <Lang id={textResourceBindings?.description} />}
          />
          <Table.Head id={`subform-${id}-table-body`}>
            <Table.Row>
              {tableColumns.length ? (
                tableColumns.map((entry, index) => (
                  <Table.HeaderCell
                    className={classes1.tableCellFormatting}
                    key={index}
                  >
                    <Lang id={entry.headerContent} />
                  </Table.HeaderCell>
                ))
              ) : (
                <Table.HeaderCell className={classes1.tableCellFormatting}>
                  <Lang id='form_filler.subform_default_header' />
                </Table.HeaderCell>
              )}
              {!pdfModeActive && (
                <Table.HeaderCell className={classNames(classes2.editColumnHeader, classes2.noRightPad)}>
                  <span className={utilClasses.visuallyHidden}>
                    <Lang id='general.edit' />
                  </span>
                </Table.HeaderCell>
              )}
            </Table.Row>
          </Table.Head>
          <Table.Body>
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
          </Table.Body>
        </Table>
      </Flex>
    </ComponentStructureWrapper>
  );
}

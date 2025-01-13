import React from 'react';

import { Paragraph, Spinner, Table } from '@digdir/designsystemet-react';
import classNames from 'classnames';

import { Flex } from 'src/app-components/Flex/Flex';
import { Caption } from 'src/components/form/caption/Caption';
import { Label } from 'src/components/label/Label';
import { useDataTypeFromLayoutSet } from 'src/features/form/layout/LayoutsContext';
import { useFormDataQuery } from 'src/features/formData/useFormDataQuery';
import { useStrictDataElements, useStrictInstanceId } from 'src/features/instance/InstanceContext';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { usePdfModeActive } from 'src/features/pdf/PDFWrapper';
import { useIsSubformPage, useNavigate } from 'src/features/routing/AppRoutingContext';
import { isSubformValidation } from 'src/features/validation';
import { useComponentValidationsForNode } from 'src/features/validation/selectors/componentValidationsForNode';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { DataQueryWithDefaultValue } from 'src/layout/Subform/SubformComponent';
import classes1 from 'src/layout/Subform/SubformComponent.module.css';
import classes2 from 'src/layout/Subform/Summary/SubformSummaryComponent2.module.css';
import { EditButton } from 'src/layout/Summary2/CommonSummaryComponents/EditButton';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import { getStatefulDataModelUrl } from 'src/utils/urls/appUrlHelper';
import type { ISubformSummaryComponent } from 'src/layout/Subform/Summary/SubformSummaryComponent';
import type { IData } from 'src/types/shared';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

function SubformTableRow({
  dataElement,
  targetNode,
  hasErrors,
  rowNumber,
  pdfModeActive,
}: {
  dataElement: IData;
  targetNode: LayoutNode<'Subform'>;
  hasErrors: boolean;
  rowNumber: number;
  pdfModeActive: boolean;
}) {
  const id = dataElement.id;
  const { tableColumns = [] } = useNodeItem(targetNode);
  const instanceId = useStrictInstanceId();
  const url = getStatefulDataModelUrl(instanceId, id, true);
  const { isFetching, data, error } = useFormDataQuery(url);
  const { langAsString } = useLanguage();
  const navigate = useNavigate();

  const numColumns = tableColumns.length;
  if (isFetching) {
    return (
      <Table.Row>
        <Table.Cell colSpan={numColumns}>
          <Spinner title={langAsString('general.loading')} />
        </Table.Cell>
      </Table.Row>
    );
  } else if (error) {
    return (
      <Table.Row>
        <Table.Cell colSpan={numColumns}>
          <Lang id='form_filler.error_fetch_subform' />
        </Table.Cell>
      </Table.Row>
    );
  }
  return (
    <Table.Row
      key={`subform-row-${id}`}
      data-row-num={rowNumber}
      className={classNames({ [classes1.tableRowError]: !pdfModeActive && hasErrors })}
    >
      {tableColumns.length ? (
        tableColumns.map((entry, index) => (
          <Table.Cell key={`subform-cell-${id}-${index}`}>
            <DataQueryWithDefaultValue
              data={data}
              query={entry.cellContent.query}
              defaultValue={entry.cellContent.default}
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
            componentNode={targetNode}
            summaryComponentId=''
            navigationOverride={() => navigate(`${targetNode.id}/${id}`)}
          />
        </Table.Cell>
      )}
    </Table.Row>
  );
}

export function SubformSummaryTable({ targetNode }: ISubformSummaryComponent): React.JSX.Element | null {
  const { id, layoutSet, textResourceBindings, tableColumns = [] } = useNodeItem(targetNode);

  const isSubformPage = useIsSubformPage();
  if (isSubformPage) {
    window.logErrorOnce('Cannot use a SubformComponent component within a subform');
    throw new Error('Cannot use a SubformComponent component within a subform');
  }

  const dataType = useDataTypeFromLayoutSet(layoutSet);
  const subformIdsWithError =
    useComponentValidationsForNode(targetNode).find(isSubformValidation)?.subformDataElementIds;

  if (!dataType) {
    window.logErrorOnce(`Unable to find data type for subform with id ${id}`);
    throw new Error(`Unable to find data type for subform with id ${id}`);
  }

  const pdfModeActive = usePdfModeActive();
  const dataElements = useStrictDataElements(dataType);

  if (dataElements.length == 0) {
    return (
      <>
        <Label
          node={targetNode}
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
    <ComponentStructureWrapper node={targetNode}>
      <Flex
        id={targetNode.id}
        container
        item
        data-componentid={targetNode.id}
        data-componentbaseid={targetNode.baseId}
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
                  <span className={classes1.visuallyHidden}>
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
                targetNode={targetNode}
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

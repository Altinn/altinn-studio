import React from 'react';

import { Spinner } from '@digdir/designsystemet-react';

import { useDataTypeFromLayoutSet } from 'src/features/form/layout/LayoutsContext';
import { useFormDataQuery } from 'src/features/formData/useFormDataQuery';
import { useStrictInstanceData } from 'src/features/instance/InstanceContext';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { DataQueryWithDefaultValue } from 'src/layout/Subform/SubformComponent';
import classes from 'src/layout/Subform/Summary/SubformSummaryComponent.module.css';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import { getStatefulDataModelUrl } from 'src/utils/urls/appUrlHelper';
import type { IData } from 'src/types/shared';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export interface ISubformSummaryComponent {
  targetNode: LayoutNode<'Subform'>;
}

export function SubformSummaryComponent({ targetNode }: ISubformSummaryComponent): React.JSX.Element | null {
  const { layoutSet, id } = useNodeItem(targetNode);
  const dataType = useDataTypeFromLayoutSet(layoutSet);
  const dataElements = useStrictInstanceData().data.filter((d) => d.dataType === dataType) ?? [];

  return (
    <div
      className={classes.container}
      data-testid={`subform-summary-${id}`}
    >
      {dataElements.length === 0 ? (
        <div className={classes.emptyField}>
          <Lang id={'general.empty_summary'} />
        </div>
      ) : (
        dataElements.map((dataElement) => (
          <SubformSummaryRow
            key={dataElement.id}
            dataElement={dataElement}
            node={targetNode}
          />
        ))
      )}
    </div>
  );
}

function SubformSummaryRow({ dataElement, node }: { dataElement: IData; node: LayoutNode<'Subform'> }) {
  const id = dataElement.id;
  const { tableColumns = [], summaryDelimiter = ' — ' } = useNodeItem(node);
  const instance = useStrictInstanceData();
  const url = getStatefulDataModelUrl(instance.id, id, true);
  const { isFetching, data, error, failureCount } = useFormDataQuery(url);
  const { langAsString } = useLanguage();

  if (isFetching) {
    return (
      <Spinner
        title={langAsString('general.loading')}
        size='xs'
      />
    );
  } else if (error) {
    console.error(`Error loading data element ${id} from server. Gave up after ${failureCount} attempt(s).`, error);
    return <Lang id='form_filler.error_fetch_subform' />;
  }

  const content = tableColumns.map((entry, i) => (
    <DataQueryWithDefaultValue
      key={i}
      data={data}
      query={entry.cellContent.query}
      defaultValue={entry.cellContent.default}
    />
  ));

  if (content.length === 0) {
    content.push(<>{id}</>);
  }

  const isLastEntry = (i: number) => i === content.length - 1;

  return (
    <div className={classes.row}>
      <div>
        {content.map((entry, i) => (
          <React.Fragment key={`wrapper-${i}`}>
            {entry}
            {!isLastEntry(i) && <span key={`delimiter-${i}`}>{summaryDelimiter}</span>}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

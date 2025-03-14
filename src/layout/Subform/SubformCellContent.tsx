import React from 'react';

import dot from 'dot-object';

import { evalExpr } from 'src/features/expressions';
import { ExprVal } from 'src/features/expressions/types';
import { ExprValidation } from 'src/features/expressions/validation';
import { Lang } from 'src/features/language/Lang';
import type { ExprConfig, ExprValToActualOrExpr, NodeReference } from 'src/features/expressions/types';
import type { ISubformCellContent } from 'src/layout/Subform/config.generated';
import type { ExpressionDataSources } from 'src/utils/layout/useExpressionDataSources';

interface DataQueryParams {
  data: unknown;
  query: string;
  defaultValue?: string;
}
function DataQueryWithDefaultValue({ data, query, defaultValue }: DataQueryParams) {
  const content = dot.pick(query, data);

  if (typeof content !== 'object' && content !== undefined) {
    return String(content);
  }
  return <Lang id={defaultValue} />;
}

interface DataValueParams {
  dataSources: ExpressionDataSources;
  reference: NodeReference;
  value: ExprValToActualOrExpr<ExprVal.String>;
  defaultValue?: string;
}
function DataValueWithDefault({ dataSources, reference, value, defaultValue }: DataValueParams) {
  const errorIntroText = `Invalid expression for component '${reference.id}'`;
  if (!ExprValidation.isValidOrScalar(value, ExprVal.String, errorIntroText)) {
    return <Lang id={defaultValue} />;
  }

  const config: ExprConfig = {
    returnType: ExprVal.String,
    defaultValue: '',
  };

  const resolvedValue = evalExpr(value, reference, dataSources, { config, errorIntroText });
  if (resolvedValue) {
    return String(resolvedValue);
  }
  return <Lang id={defaultValue} />;
}

type SubformCellContentProps = {
  cellContent: ISubformCellContent;
  reference: NodeReference;
  data: unknown;
  dataSources: ExpressionDataSources;
};

export function SubformCellContent({ cellContent, reference, dataSources, data }: SubformCellContentProps) {
  if ('query' in cellContent) {
    return (
      <DataQueryWithDefaultValue
        data={data}
        query={cellContent.query}
        defaultValue={cellContent.default}
      />
    );
  }
  return (
    <DataValueWithDefault
      dataSources={dataSources}
      reference={reference}
      value={cellContent.value}
      defaultValue={cellContent.default}
    />
  );
}

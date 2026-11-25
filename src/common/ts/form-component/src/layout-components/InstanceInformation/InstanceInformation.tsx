import type { ReactNode } from 'react';

import cn from 'classnames';

import { Fieldset } from '../../app-components';
import { useTranslation } from '../../LanguageTranslatorProvider';
import { ComponentStructure } from '../common/ComponentStructure';
import { Description } from '../common/Description';
import { HelpTextContainer } from '../common/HelpTextContainer';
import classes from './InstanceInformation.module.css';
import type { IGridStyling } from '../../app-components/Flex';

export type InstanceSummaryDataObject = {
  [name: string]: {
    value: string | boolean | number | null | undefined;
    hideFromVisualTesting?: boolean;
  };
};

export interface InstanceInformationProps {
  summaryDataObject: InstanceSummaryDataObject;
  componentId?: string;
  title?: string;
  description?: string;
  help?: string;
  labelGrid?: IGridStyling;
  innerGrid?: IGridStyling;
}

function SummaryTable({ summaryDataObject }: { summaryDataObject: InstanceSummaryDataObject }) {
  return (
    <table className={classes.table}>
      <tbody>
        {Object.entries(summaryDataObject).map(([key, value]) => (
          <tr key={key}>
            <td className={classes.key}>{key}:</td>
            <td className={cn({ ['no-visual-testing']: value.hideFromVisualTesting })}>
              {value.value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function InstanceInformation({
  componentId,
  summaryDataObject,
  title,
  description,
  help,
  labelGrid,
  innerGrid,
}: InstanceInformationProps) {
  const { lang, langAsString } = useTranslation();

  const table = <SummaryTable summaryDataObject={summaryDataObject} />;
  const content = componentId ? (
    <ComponentStructure componentId={componentId} innerGrid={innerGrid}>
      {table}
    </ComponentStructure>
  ) : (
    table
  );

  if (!title && !description && !help) {
    return content;
  }

  const legendNode: ReactNode = title ? <>{lang(title)}</> : undefined;
  const descriptionNode = description ? (
    <Description componentId={componentId} description={lang(description)} />
  ) : undefined;
  const helpNode = help ? (
    <HelpTextContainer id={componentId} title={langAsString(title)} helpText={lang(help)} />
  ) : undefined;

  return (
    <Fieldset grid={labelGrid} legend={legendNode} description={descriptionNode} help={helpNode}>
      {content}
    </Fieldset>
  );
}

import React from 'react';

import { Expressions } from '@app/layout-contract/generated/expressions.generated';
import { Heading } from '@digdir/designsystemet-react';

import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { Lang } from 'src/features/language/Lang';
import { ComponentValidations } from 'src/features/validation/ComponentValidations';
import { useBindingValidationsFor } from 'src/features/validation/selectors/bindingValidationsForNode';
import classes from 'src/layout/PersonLookup/PersonLookupSummary.module.css';
import { SingleValueSummary } from 'src/layout/Summary2/CommonSummaryComponents/SingleValueSummary';
import { SummaryContains, SummaryFlex } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useSummaryOverrides, useSummaryProp } from 'src/layout/Summary2/summaryStoreContext';
import { useComponentConfig, useDataModelBindingsFor } from 'src/utils/layout/hooks';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export function PersonLookupSummary({ targetBaseComponentId }: Summary2Props) {
  const config = useComponentConfig(targetBaseComponentId, 'PersonLookup');
  const dataModelBindings = useDataModelBindingsFor(targetBaseComponentId, 'PersonLookup');
  const required = useEvalExpression(config.required, Expressions.PersonLookup.required);
  const title = useEvalExpression(
    config.textResourceBindings?.title,
    Expressions.PersonLookup.textResourceBindings.title,
  );

  const { formData } = useDataModelBindings(dataModelBindings);
  const { fullName, ssn } = formData;
  const emptyFieldText = useSummaryOverrides<'PersonLookup'>(targetBaseComponentId)?.emptyFieldText;
  const isCompact = useSummaryProp('isCompact');
  const bindingValidations = useBindingValidationsFor<'PersonLookup'>(targetBaseComponentId);
  const isEmpty = !(fullName || ssn);

  return (
    <SummaryFlex
      targetBaseId={targetBaseComponentId}
      content={
        isEmpty
          ? required
            ? SummaryContains.EmptyValueRequired
            : SummaryContains.EmptyValueNotRequired
          : SummaryContains.SomeUserContent
      }
    >
      <div className={classes.personSummaryWrapper}>
        <Heading
          data-size='sm'
          level={2}
        >
          <Lang id={config.textResourceBindings?.title === undefined ? undefined : title} />
        </Heading>
        <div className={classes.personLookupComponent}>
          <div className={classes.personLookupComponentSsn}>
            <SingleValueSummary
              title={<Lang id='person_lookup.ssn_label' />}
              displayData={ssn ? obfuscateSsn(ssn) : ''}
              targetBaseComponentId={targetBaseComponentId}
              hideEditButton={true}
              isCompact={isCompact}
              emptyFieldText={emptyFieldText}
            />
            <ComponentValidations
              validations={bindingValidations?.ssn}
              baseComponentId={targetBaseComponentId}
            />
          </div>

          <div className={classes.personLookupComponentName}>
            <SingleValueSummary
              title={<Lang id='person_lookup.name_label' />}
              displayData={fullName}
              targetBaseComponentId={targetBaseComponentId}
              hideEditButton={false}
              isCompact={isCompact}
              emptyFieldText={emptyFieldText}
            />
            <ComponentValidations
              validations={bindingValidations?.fullName}
              baseComponentId={targetBaseComponentId}
            />
          </div>
        </div>
      </div>
    </SummaryFlex>
  );
}

function obfuscateSsn(ssn: string): string {
  return `${ssn.slice(0, -5)} *****`;
}

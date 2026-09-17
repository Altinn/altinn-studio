import React from 'react';

import { Expressions } from '@app/layout-contract/generated/expressions.generated';
import { Heading } from '@digdir/designsystemet-react';

import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { Lang } from 'src/features/language/Lang';
import { ComponentValidations } from 'src/features/validation/ComponentValidations';
import { useBindingValidationsFor } from 'src/features/validation/selectors/bindingValidationsForNode';
import classes from 'src/layout/OrganizationLookup/OrganizationLookupSummary.module.css';
import { SingleValueSummary } from 'src/layout/Summary2/CommonSummaryComponents/SingleValueSummary';
import { SummaryContains, SummaryFlex } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useSummaryOverrides, useSummaryProp } from 'src/layout/Summary2/summaryStoreContext';
import { useComponentConfig, useDataModelBindingsFor } from 'src/utils/layout/hooks';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export function OrganizationLookupSummary({ targetBaseComponentId }: Summary2Props) {
  const config = useComponentConfig(targetBaseComponentId, 'OrganizationLookup');
  const dataModelBindings = useDataModelBindingsFor(targetBaseComponentId, 'OrganizationLookup');
  const required = useEvalExpression(config.required, Expressions.OrganizationLookup.required);
  const summaryTitle = useEvalExpression(
    config.textResourceBindings?.summaryTitle,
    Expressions.OrganizationLookup.textResourceBindings.summaryTitle,
  );
  const resolvedTitle = useEvalExpression(
    config.textResourceBindings?.title,
    Expressions.OrganizationLookup.textResourceBindings.title,
  );

  const title =
    (config.textResourceBindings?.summaryTitle === undefined ? undefined : summaryTitle) ||
    (config.textResourceBindings?.title === undefined ? undefined : resolvedTitle);
  const { formData } = useDataModelBindings(dataModelBindings);
  const { orgnr, name } = formData;
  const emptyFieldText = useSummaryOverrides<'OrganizationLookup'>(targetBaseComponentId)?.emptyFieldText;
  const isCompact = useSummaryProp('isCompact');
  const bindingValidations = useBindingValidationsFor<'OrganizationLookup'>(targetBaseComponentId);
  const isEmpty = !(orgnr || name);

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
      <div className={classes.organisationSummaryWrapper}>
        <Heading
          data-size='sm'
          level={2}
        >
          <Lang id={title} />
        </Heading>
        <div className={classes.organizationLookupSummary}>
          <div className={classes.organizationLookupSummaryNr}>
            <SingleValueSummary
              title={<Lang id='organization_lookup.orgnr_label' />}
              displayData={orgnr}
              targetBaseComponentId={targetBaseComponentId}
              hideEditButton={name ? true : false}
              isCompact={isCompact}
              emptyFieldText={emptyFieldText}
            />
            <ComponentValidations
              validations={bindingValidations?.orgnr}
              baseComponentId={targetBaseComponentId}
            />
          </div>
          {name && (
            <div className={classes.organizationLookupSummaryName}>
              <SingleValueSummary
                title={<Lang id='organization_lookup.org_name' />}
                displayData={name}
                targetBaseComponentId={targetBaseComponentId}
                hideEditButton={false}
                isCompact={isCompact}
                emptyFieldText={emptyFieldText}
              />
              <ComponentValidations
                validations={bindingValidations?.name}
                baseComponentId={targetBaseComponentId}
              />
            </div>
          )}
        </div>
      </div>
    </SummaryFlex>
  );
}

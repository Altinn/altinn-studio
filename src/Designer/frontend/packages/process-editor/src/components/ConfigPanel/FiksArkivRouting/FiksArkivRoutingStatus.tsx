import type { ReactElement } from 'react';
import { StudioAlert, StudioButton, StudioParagraph } from '@studio/components';
import type { Element } from 'bpmn-js/lib/model/Types';
import type Selection from 'diagram-js/lib/features/selection/Selection';
import { useTranslation } from 'react-i18next';
import { useBpmnContext } from '../../../contexts/BpmnContext';
import { useBpmnApiContext } from '../../../contexts/BpmnApiContext';
import { getRoutingIssues, hasKnownFiksArkivRouting } from '../../../utils/fiksArkivRouting';
import classes from './FiksArkivRouting.module.css';

export function FiksArkivRoutingStatus({ gateway }: { gateway: Element }): ReactElement {
  const { t } = useTranslation();
  const { modelerRef } = useBpmnContext();
  const { fiksArkivRouting } = useBpmnApiContext();
  if (!hasKnownFiksArkivRouting(fiksArkivRouting)) {
    return (
      <StudioAlert data-color='info'>
        <StudioParagraph data-size='sm'>
          {t(
            `process_editor.fiks_arkiv_routing.unavailable.${fiksArkivRouting?.unavailableReason ?? 'loading'}`,
          )}
        </StudioParagraph>
      </StudioAlert>
    );
  }
  const issues = getRoutingIssues(gateway, fiksArkivRouting);
  const customIssue = issues.find((issue) => issue.kind === 'custom');
  const visibleIssues = issues.filter((issue) => issue.kind !== 'custom');
  if (customIssue) visibleIssues.push(customIssue);
  return (
    <>
      {visibleIssues.map((issue) => (
        <StudioAlert key={issue.outcome} data-color={issue.kind === 'custom' ? 'info' : 'warning'}>
          <StudioParagraph data-size='sm'>
            {t(`process_editor.fiks_arkiv_routing.${issue.kind}_route`, {
              outcome: t(`process_editor.fiks_arkiv_routing.${issue.outcome}`).toLocaleLowerCase(
                'nb',
              ),
            })}
          </StudioParagraph>
          <ul className={classes.links}>
            {issue.flows.map((flow) => (
              <li key={flow.id}>
                <StudioButton
                  variant='tertiary'
                  onClick={() => modelerRef.current.get<Selection>('selection').select(flow)}
                >
                  {t('process_editor.fiks_arkiv_routing.edit_route', {
                    task: flow.target?.businessObject?.name || flow.target?.id || flow.id,
                  })}
                </StudioButton>
              </li>
            ))}
          </ul>
        </StudioAlert>
      ))}
      <StudioParagraph data-size='sm'>
        {t('process_editor.fiks_arkiv_routing.configuration_source')}
      </StudioParagraph>
    </>
  );
}

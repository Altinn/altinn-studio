import { StudioCard, StudioTabs } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { useQueryParamState } from 'admin/features/apps/hooks/useQueryParamState';
import { Instances } from 'admin/features/apps/pages/instances/Instances';
import { WorkflowProblems } from 'admin/features/apps/pages/workflowProblems/WorkflowProblems';

import classes from './InstancesSection.module.css';

const ALL_INSTANCES_TAB = 'all';
const PROBLEMS_TAB = 'problems';

export type InstancesSectionProps = {
  org: string;
  environment: string;
  app: string;
};

/**
 * The instance lists for one app: everything Storage knows, and the subset the workflow engine
 * reports failures for. Two independent lists with two independent pagers — Storage pages by
 * continuation token, the engine by its own cursor — so they are separate tabs rather than one
 * filtered table.
 */
export const InstancesSection = ({ org, environment, app }: InstancesSectionProps) => {
  const { t } = useTranslation();
  const [selectedTab, setSelectedTab] = useQueryParamState<string>(
    'instancesTab',
    ALL_INSTANCES_TAB,
  );
  const activeTab = selectedTab === PROBLEMS_TAB ? PROBLEMS_TAB : ALL_INSTANCES_TAB;

  return (
    <StudioCard>
      <StudioTabs value={activeTab} onChange={setSelectedTab}>
        <StudioTabs.List>
          <StudioTabs.Tab value={ALL_INSTANCES_TAB}>{t('admin.instances.title')}</StudioTabs.Tab>
          <StudioTabs.Tab value={PROBLEMS_TAB}>
            {t('admin.workflows.problems.title')}
          </StudioTabs.Tab>
        </StudioTabs.List>
        <StudioTabs.Panel value={ALL_INSTANCES_TAB} className={classes.panel}>
          {activeTab === ALL_INSTANCES_TAB && <Instances />}
        </StudioTabs.Panel>
        <StudioTabs.Panel value={PROBLEMS_TAB} className={classes.panel}>
          {/* Mounted only while selected: the discovery read is a separate engine query and should
              not fire just because the app page was opened. */}
          {activeTab === PROBLEMS_TAB && (
            <WorkflowProblems org={org} environment={environment} app={app} />
          )}
        </StudioTabs.Panel>
      </StudioTabs>
    </StudioCard>
  );
};

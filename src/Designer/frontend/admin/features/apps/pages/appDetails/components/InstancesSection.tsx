import { StudioCard, StudioTabs } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { useQueryParamState } from 'admin/features/apps/hooks/useQueryParamState';
import { useAppUsesWorkflowEngine } from 'admin/features/apps/hooks/useAppUsesWorkflowEngine';
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
 * The instances of one app. An app that runs its process on the workflow engine gets the engine's
 * view of them too; any other app — most apps in production, and any app that has not yet said
 * which app libraries it runs on — gets the Storage list alone, as it was before the engine, and
 * the engine is asked nothing about it.
 */
export const InstancesSection = ({ org, environment, app }: InstancesSectionProps) => {
  const usesWorkflowEngine = useAppUsesWorkflowEngine(org, environment, app);
  return usesWorkflowEngine ? (
    <InstancesWithWorkflowProblems org={org} environment={environment} app={app} />
  ) : (
    <Instances showWorkflowHealth={false} />
  );
};

/**
 * The instance lists for an app on the workflow engine: everything Storage knows, and the subset
 * the engine reports failures for. Two independent lists with two independent pagers — Storage
 * pages by continuation token, the engine by its own cursor — so they are separate tabs rather
 * than one filtered table.
 */
const InstancesWithWorkflowProblems = ({ org, environment, app }: InstancesSectionProps) => {
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
          {activeTab === ALL_INSTANCES_TAB && <Instances showWorkflowHealth />}
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

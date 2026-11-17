import { useTranslation } from 'react-i18next';
import type { AppDeploymentEvent } from 'admin/features/apps/types/AppDeploymentEvent';
import classes from './DeploymentList.module.css';

export type DeploymentListProps = {
  deployments: AppDeploymentEvent[];
};

const formatTime = (iso: string): string =>
  new Date(iso).toLocaleString('nb-NO', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

/** The deployments drawn in a chart, as a list: the table alternative to the dashed lines. */
export const DeploymentList = ({ deployments }: DeploymentListProps) => {
  const { t } = useTranslation();
  if (deployments.length === 0) {
    return null;
  }
  return (
    <ul className={classes.list} aria-label={t('admin.metrics.deployments')}>
      {deployments.map((deployment) => (
        <li
          key={`${deployment.finishedAt}-${deployment.tagName}`}
          className={deployment.deploymentType === 'decommission' ? classes.undeploy : undefined}
        >
          <span>{formatTime(deployment.finishedAt)}</span>
          <b>
            {deployment.deploymentType === 'decommission'
              ? t('admin.metrics.deployments.undeploy')
              : deployment.tagName}
          </b>
          <span>{deployment.createdBy}</span>
        </li>
      ))}
    </ul>
  );
};

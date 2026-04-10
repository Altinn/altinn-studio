import type { ReactElement } from 'react';
import { StudioTable, StudioTag } from '@studio/components';
import classes from './EnvironmentsCell.module.css';
import { useTranslation } from 'react-i18next';

type EnvironmentsCellProps = {
  environments: string[];
};

export const EnvironmentsCell = ({ environments }: EnvironmentsCellProps): ReactElement => {
  const { t } = useTranslation();

  return (
    <StudioTable.Cell>
      {environments.length === 0 ? (
        <StudioTag data-color='warning'>{t('settings.no_environments')}</StudioTag>
      ) : (
        <div className={classes.environmentsWrapper}>
          {environments.map((env) => (
            <StudioTag key={env} data-color='info'>
              {env}
            </StudioTag>
          ))}
        </div>
      )}
    </StudioTable.Cell>
  );
};

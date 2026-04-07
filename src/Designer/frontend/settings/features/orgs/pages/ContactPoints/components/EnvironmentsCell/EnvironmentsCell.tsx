import type { ReactElement } from 'react';
import { StudioTable, StudioTag } from '@studio/components';
import classes from './EnvironmentsCell.module.css';

type EnvironmentsCellProps = {
  environments: string[];
};

export const EnvironmentsCell = ({ environments }: EnvironmentsCellProps): ReactElement => (
  <StudioTable.Cell>
    <div className={classes.environmentsWrapper}>
      {environments.map((env) => (
        <StudioTag key={env}>{env}</StudioTag>
      ))}
    </div>
  </StudioTable.Cell>
);

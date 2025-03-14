import React from 'react';

import cn from 'classnames';

import { Lang } from 'src/features/language/Lang';
import classes from 'src/features/navigation/components/TaskGroup.module.css';
import { getTaskIcon, useGetTaskGroupType, useGetTaskName } from 'src/features/navigation/utils';
import type { NavigationReceipt, NavigationTask } from 'src/layout/common.generated';

export function TaskGroup({ group, active }: { group: NavigationTask | NavigationReceipt; active: boolean }) {
  const getTaskType = useGetTaskGroupType();
  const getTaskName = useGetTaskName();

  const Icon = getTaskIcon(getTaskType(group));

  return (
    <li>
      <button
        aria-current={active ? 'step' : undefined}
        disabled
        className={cn(classes.taskButton, 'fds-focus')}
      >
        <div className={cn(classes.taskSymbol, active ? classes.taskSymbolActive : classes.taskSymbolLocked)}>
          <Icon aria-hidden />
        </div>
        <span className={cn(classes.taskName, { [classes.taskNameActive]: active })}>
          <Lang id={getTaskName(group)} />
        </span>
      </button>
    </li>
  );
}

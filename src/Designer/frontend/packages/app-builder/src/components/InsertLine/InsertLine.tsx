import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import cn from 'classnames';
import { PlusIcon } from '@designer/icons';
import classes from './InsertLine.module.css';

export type InsertLineProps = {
  className?: string;
  onClick: () => void;
};

/** The gap above a component, where hovering shows a button that adds a component there. */
export function InsertLine({ className, onClick }: InsertLineProps): ReactElement {
  const { t } = useTranslation();
  return (
    <div className={cn(classes.insertLine, className)}>
      <button type='button' className={classes.button} onClick={onClick}>
        <PlusIcon aria-hidden />
        {t('app_builder.add_here')}
      </button>
    </div>
  );
}

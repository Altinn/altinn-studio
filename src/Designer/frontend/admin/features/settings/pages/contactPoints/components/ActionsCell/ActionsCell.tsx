import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioTable, StudioButton, StudioDeleteButton } from '@studio/components';
import { StudioEditIcon } from '@studio/icons';
import classes from './ActionsCell.module.css';

type ActionsCellProps = {
  onEdit: () => void;
  onDelete: () => void;
  editAriaLabel: string;
};

export const ActionsCell = ({
  onEdit,
  onDelete,
  editAriaLabel,
}: ActionsCellProps): ReactElement => {
  const { t } = useTranslation();
  return (
    <StudioTable.Cell className={classes.actions}>
      <StudioButton
        variant='tertiary'
        icon={<StudioEditIcon />}
        onClick={onEdit}
        aria-label={editAriaLabel}
      />
      <StudioDeleteButton
        onDelete={onDelete}
        confirmMessage={t('org.settings.contact_points.delete_confirm')}
      />
    </StudioTable.Cell>
  );
};

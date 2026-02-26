import React from 'react';
import { Tag } from '@digdir/designsystemet-react';
import type { SimpleInstance } from 'admin/types/InstancesResponse';

import classes from './InstanceStatus.module.css';
import { useTranslation } from 'react-i18next';

type InstanceStatusProps = {
  instance: SimpleInstance;
};

export const InstanceStatus = ({ instance }: InstanceStatusProps) => {
  const statuses = getInstanceStatuses(instance);
  return (
    <div className={classes.container}>
      {statuses.map((status: InstanceStatuses) => (
        <InstanceStatusChip key={status} status={status} />
      ))}
    </div>
  );
};

type InstanceStatusChipProps = {
  status: InstanceStatuses;
};

const InstanceStatusChip = ({ status }: InstanceStatusChipProps) => {
  const { t } = useTranslation();

  switch (status) {
    case InstanceStatuses.Unread:
      return (
        <Tag size='sm' color='warning'>
          {t('admin.instances.status.unread')}
        </Tag>
      );
    case InstanceStatuses.Active:
      return (
        <Tag size='sm' color='first'>
          {t('admin.instances.status.active')}
        </Tag>
      );
    case InstanceStatuses.Archived:
      return (
        <Tag size='sm' color='success'>
          {t('admin.instances.status.completed')}
        </Tag>
      );
    case InstanceStatuses.Confirmed:
      return (
        <Tag size='sm' color='success'>
          {t('admin.instances.status.confirmed')}
        </Tag>
      );
    case InstanceStatuses.SoftDeleted:
      return (
        <Tag size='sm' color='danger'>
          {t('admin.instances.status.deleted')}
        </Tag>
      );
  }
};

enum InstanceStatuses {
  Unread = 'unread',
  Active = 'active',
  Archived = 'archived',
  Confirmed = 'confirmed',
  SoftDeleted = 'softDeleted',
}

function getInstanceStatuses(instance: SimpleInstance): InstanceStatuses[] {
  const statuses: InstanceStatuses[] = [];
  if (instance.isRead && !instance.archivedAt && !instance.confirmedAt && !instance.softDeletedAt) {
    statuses.push(InstanceStatuses.Active);
  }

  // Can it be completed and unread?
  if (!instance.isRead) {
    statuses.push(InstanceStatuses.Unread);
  }

  if (instance.archivedAt) {
    statuses.push(InstanceStatuses.Archived);
  }

  if (instance.confirmedAt) {
    statuses.push(InstanceStatuses.Confirmed);
  }

  if (instance.softDeletedAt) {
    statuses.push(InstanceStatuses.SoftDeleted);
  }

  return statuses;
}

import React from 'react';
import { Tag } from '@digdir/designsystemet-react';
import type { SimpleInstance } from 'admin/types/InstancesResponse';

import classes from './InstanceStatus.module.css';

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
  switch (status) {
    case InstanceStatuses.Unread:
      return (
        <Tag size='sm' color='warning'>
          Ulest
        </Tag>
      );
    case InstanceStatuses.Active:
      return (
        <Tag size='sm' color='first'>
          Aktiv
        </Tag>
      );
    // TODO: Using archivedAt to check if the process is complete may be incorrect?
    case InstanceStatuses.Archived:
      return (
        <Tag size='sm' color='success'>
          Levert av bruker
        </Tag>
      );
    case InstanceStatuses.Confirmed:
      return (
        <Tag size='sm' color='success'>
          Bekreftet mottatt
        </Tag>
      );
    case InstanceStatuses.SoftDeleted:
      return (
        <Tag size='sm' color='danger'>
          Slettet
        </Tag>
      );
    case InstanceStatuses.HardDeleted:
      return (
        <Tag size='sm' color='danger'>
          Slettet permanent
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
  HardDeleted = 'hardDeleted',
}

function getInstanceStatuses(instance: SimpleInstance): InstanceStatuses[] {
  const statuses: InstanceStatuses[] = [];
  if (
    instance.isRead &&
    !instance.archivedAt &&
    !instance.confirmedAt &&
    !instance.softDeletedAt &&
    !instance.hardDeletedAt
  ) {
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

  if (instance.softDeletedAt && !instance.hardDeletedAt) {
    statuses.push(InstanceStatuses.SoftDeleted);
  }

  if (instance.hardDeletedAt) {
    statuses.push(InstanceStatuses.HardDeleted);
  }

  return statuses;
}

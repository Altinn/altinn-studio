import React from 'react';
import { Tag } from '@digdir/designsystemet-react';
import type { SimpleInstance } from 'admin/types/InstancesResponse';

import classes from './InstanceStatus.module.css';

type InstanceStatusProps = {
  instance: SimpleInstance;
};

export const InstanceStatus = ({ instance }: InstanceStatusProps) => {
  const statuses = getInstanceStatus(instance);
  return (
    <div className={classes.container}>
      {statuses.map((status: Status) => (
        <InstanceStatusChip key={status} status={status} />
      ))}
    </div>
  );
};

type InstanceStatusChipProps = {
  status: Status;
};

const InstanceStatusChip = ({ status }: InstanceStatusChipProps) => {
  switch (status) {
    case Status.Unread:
      return (
        <Tag size='sm' color='warning'>
          Ulest
        </Tag>
      );
    case Status.Active:
      return (
        <Tag size='sm' color='first'>
          Aktiv
        </Tag>
      );
    case Status.Archived:
      return (
        <Tag size='sm' color='success'>
          Levert av bruker
        </Tag>
      );
    case Status.Confirmed:
      return (
        <Tag size='sm' color='success'>
          Bekreftet mottatt
        </Tag>
      );
    case Status.SoftDeleted:
      return (
        <Tag size='sm' color='danger'>
          Slettet
        </Tag>
      );
    case Status.HardDeleted:
      return (
        <Tag size='sm' color='danger'>
          Slettet permanent
        </Tag>
      );
  }
};

enum Status {
  Unread = 'unread',
  Active = 'active',
  Archived = 'archived',
  Confirmed = 'confirmed',
  SoftDeleted = 'softDeleted',
  HardDeleted = 'hardDeleted',
}

/*
 * These are the (assumed) possible states an instance can exist in.
 */
type InstanceStatus =
  | [Status.Unread]
  | [Status.Active]
  | [Status.Archived]
  | [Status.Archived, Status.Confirmed]
  | [Status.Archived, Status.Confirmed, Status.SoftDeleted]
  | [Status.Archived, Status.Confirmed, Status.HardDeleted];

function getInstanceStatus(instance: SimpleInstance): InstanceStatus {
  if (instance.archivedAt && instance.confirmedAt && instance.hardDeletedAt) {
    return [Status.Archived, Status.Confirmed, Status.HardDeleted];
  }
  if (instance.archivedAt && instance.confirmedAt && instance.softDeletedAt) {
    return [Status.Archived, Status.Confirmed, Status.SoftDeleted];
  }
  if (instance.archivedAt && instance.confirmedAt) {
    return [Status.Archived, Status.Confirmed];
  }
  if (instance.archivedAt) {
    return [Status.Archived];
  }
  if (instance.isRead) {
    return [Status.Active];
  }
  if (!instance.isRead) {
    return [Status.Unread];
  }
  throw new Error(`Unknown state for instance:\n${JSON.stringify(instance)}`);
}

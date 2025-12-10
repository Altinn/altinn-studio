import { v4 as uuid } from 'uuid';

export const storageApplicationMetadataRoute = async (req, res) => {
  res.json({});
};
export const storageTextsRoute = async (req, res) => {
  res.json({});
};

function getRandomDate(
  min = Date.now() - 100 * 24 * 60 * 60 * 1000,
  max = Date.now() - 60 * 60 * 1000,
) {
  return new Date(Math.round(min + Math.random() * (max - min)));
}

function getMaxDate(...dates) {
  return new Date(Math.max(...dates.filter((d) => !!d).map((d) => d.getTime())));
}

const randomInstances = Array.from({ length: 1000 }).map(() => {
  const id = uuid();
  const createdAt = getRandomDate();

  const isActive = Math.random() < 0.2;

  const isRead = !isActive || Math.random() < 0.8;
  const currentTaskId = isActive ? 'Task_1' : null;
  const currentTaskName = isActive ? 'Utfylling' : null;
  const archivedAt = !isActive ? getRandomDate(createdAt.getTime()) : null;
  const completedAt = archivedAt;
  const confirmedAt = !isActive && Math.random() < 0.8 ? getRandomDate(archivedAt.getTime()) : null;

  const isDeleted = (!isActive && Math.random() < 0.8) || Math.random() < 0.2;
  const isHardDeleted = isDeleted && Math.random() < 0.33;

  const softDeletedAt = isDeleted
    ? getRandomDate(getMaxDate(createdAt, archivedAt, confirmedAt).getTime())
    : null;
  const hardDeletedAt = isHardDeleted ? softDeletedAt : null;

  const lastChangedAt = getMaxDate(createdAt, archivedAt, confirmedAt, softDeletedAt);

  return {
    id,
    isRead,
    currentTaskId,
    currentTaskName,
    archivedAt,
    completedAt,
    confirmedAt,
    softDeletedAt,
    hardDeletedAt,
    createdAt,
    lastChangedAt,
  };
});

function parseBoolParam(param) {
  if (param === 'true') {
    return true;
  }
  if (param === 'false') {
    return false;
  }
  return null;
}

function parseIntParam(param) {
  const n = parseInt(param);
  return !isNaN(n) ? n : null;
}

export const storageInstancesRoute = (req, res) => {
  const { org, app } = req.params;
  const currentTask = req.query?.['process.currentTask'];
  const isArchived = parseBoolParam(req.query?.['status.isArchived']);
  const isConfirmed = parseBoolParam(req.query?.['confirmed']);
  const isSoftDeleted = parseBoolParam(req.query?.['status.isSoftDeleted']);
  const isHardDeleted = parseBoolParam(req.query?.['status.isHardDeleted']);
  const archiveReference = req.query?.['archiveReference'];
  const size = parseIntParam(req.query?.['size']) ?? 10;
  const skip = parseIntParam(req.query?.['continuationToken']) ?? 0;

  const instances = randomInstances
    .filter(
      (i) =>
        (!currentTask || i.currentTaskId === currentTask) &&
        (isArchived == null || (isArchived && !!i.archivedAt) || (!isArchived && !i.archivedAt)) &&
        (isConfirmed == null ||
          (isConfirmed && !!i.confirmedAt) ||
          (!isConfirmed && !i.confirmedAt)) &&
        (isSoftDeleted == null ||
          (isSoftDeleted && !!i.softDeletedAt) ||
          (!isSoftDeleted && !i.softDeletedAt)) &&
        (isHardDeleted == null ||
          (isHardDeleted && !!i.hardDeletedAt) ||
          (!isHardDeleted && !i.hardDeletedAt)) &&
        (!archiveReference ||
          i.id === archiveReference.toLowerCase() ||
          i.id.slice(24) === archiveReference.toLowerCase()),
    )
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(skip, skip + size)
    .map((i) => ({ org, app, ...i }));

  const count = instances.length;
  const next = count === size ? (skip + size).toString() : null;

  res.json({
    count,
    next,
    instances,
  });
};

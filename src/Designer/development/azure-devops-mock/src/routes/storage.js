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

  const generateDataElement = () => ({
    id: uuid(),
    dataType: 'model',
    contentType: 'application/xml',
    size: Math.round(Math.random() * 1000),
    locked: !isActive,
    isRead,
    fileScanResult: 'NotApplicable',
    hardDeletedAt,
    createdAt,
    lastChangedAt: getRandomDate(createdAt.getTime(), (archivedAt ?? lastChangedAt).getTime()),
  });

  const generatePdfDataElement = () => ({
    id: uuid(),
    dataType: 'ref-data-as-pdf',
    contentType: 'application/pdf',
    size: Math.round(Math.random() * 1000),
    locked: false,
    isRead: true,
    fileScanResult: 'NotApplicable',
    hardDeletedAt,
    createdAt: archivedAt,
    lastChangedAt: archivedAt,
  });

  const data = archivedAt
    ? [generateDataElement(), generatePdfDataElement()]
    : [generateDataElement()];

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
    data,
  };
});

function parseIntParam(param) {
  const n = parseInt(param);
  return !isNaN(n) ? n : null;
}

function parseBoolConstraintParam(param) {
  if (param === 'true') {
    return (value) => Boolean(value);
  }
  if (param === 'false') {
    return (value) => !Boolean(value);
  }
  return (_) => true;
}

function getDateOnly(datetime) {
  return new Date(datetime.toISOString().slice(0, 10)).getTime();
}

function parseDateConstraintParam(param) {
  if (!param) {
    return (_) => true;
  }

  const params = Array.isArray(param) ? param : [param];
  const constraints = params.map((value) => {
    if (!value.includes(':')) {
      return { type: 'eq', date: new Date(value).getTime() };
    }
    const [type, date] = value.split(':');
    return { type, date: new Date(date).getTime() };
  });

  return (value) =>
    constraints.every(({ type, date }) => {
      switch (type) {
        case 'eq':
          return getDateOnly(value) == date;
        case 'lt':
          return getDateOnly(value) < date;
        case 'lte':
          return getDateOnly(value) <= date;
        case 'gt':
          return getDateOnly(value) > date;
        case 'gte':
          return getDateOnly(value) >= date;
        default:
          throw new Error('Bad date param');
      }
    });
}

export const storageInstancesRoute = (req, res) => {
  const { org, app } = req.params;
  const currentTask = req.query?.['process.currentTask'];
  const archiveReference = req.query?.['archiveReference']?.toLowerCase();
  const isArchivedConstraint = parseBoolConstraintParam(req.query?.['status.isArchived']);
  const isConfirmedConstraint = parseBoolConstraintParam(req.query?.['confirmed']);
  const isSoftDeletedConstraint = parseBoolConstraintParam(req.query?.['status.isSoftDeleted']);
  const isHardDeletedConstraint = parseBoolConstraintParam(req.query?.['status.isHardDeleted']);
  const createdConstraint = parseDateConstraintParam(req.query?.['created']);
  const size = parseIntParam(req.query?.['size']) ?? 10;
  const skip = parseIntParam(req.query?.['continuationToken']) ?? 0;

  const instances = randomInstances
    .filter(
      (i) =>
        (!currentTask || i.currentTaskId === currentTask) &&
        (!archiveReference || i.id === archiveReference || i.id.slice(24) === archiveReference) &&
        isArchivedConstraint(i.archivedAt) &&
        isConfirmedConstraint(i.confirmedAt) &&
        isSoftDeletedConstraint(i.softDeletedAt) &&
        isHardDeletedConstraint(i.hardDeletedAt) &&
        createdConstraint(i.createdAt),
    )
    .toSorted((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(skip, skip + size)
    .map(({ data, ...i }) => ({ org, app, ...i }));

  const count = instances.length;
  const next = count === size ? (skip + size).toString() : null;

  res.json({
    count,
    next,
    instances,
  });
};

export const storageInstanceDetailsRoute = (req, res) => {
  const { org, app, instanceId } = req.params;
  const instance = randomInstances.find((i) => i.id === instanceId);

  if (!instance) {
    res.sendStatus(404);
    return;
  }

  res.json({ org, app, ...instance });
};

import { v4 as uuid } from 'uuid';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ARCHIVE_REF_REGEX = /^[0-9a-f]{12}$/i;

export const storageApplicationMetadataRoute = async (req, res) => {
  res.json({});
};
export const storageTextsRoute = async (req, res) => {
  res.json({});
};

const taskNames = { Task_1: 'Utfylling' };

function makeInstance(org, app, currentTask, isComplete, archiveReference = null) {
  if (currentTask == null && isComplete == null) {
    if (Math.random() < 0.5) {
      currentTask = 'Task_1';
    } else {
      isComplete = true;
    }
  }

  const id = archiveReference
    ? UUID_REGEX.test(archiveReference)
      ? archiveReference
      : uuid().slice(0, 24) + archiveReference.toLowerCase()
    : uuid();

  if (currentTask) {
    const isRead = Math.random() < 0.5;

    return {
      id,
      org,
      app,
      isRead,
      currentTaskName: taskNames[currentTask],
      currentTaskId: currentTask,
      createdAt: new Date(),
      lastChangedAt: new Date(),
    };
  }

  // Instance is completed
  const isConfirmed = Math.random() < 0.5;
  const isSoftDeleted = isConfirmed && Math.random() < 0.5;
  const isHardDeleted = isConfirmed && !isSoftDeleted && Math.random() < 0.5;

  return {
    id,
    org,
    app,
    isRead: true,
    archivedAt: new Date(),
    confirmedAt: isConfirmed ? new Date() : null,
    softDeletedAt: isSoftDeleted ? new Date() : null,
    hardDeletedAt: isHardDeleted ? new Date() : null,
    createdAt: new Date(),
    lastChangedAt: new Date(),
  };
}

export const storageInstancesRoute = (req, res) => {
  const { org, app } = req.params;
  const currentTask = req.query?.['process.currentTask'];
  const isComplete = req.query?.['process.isComplete'];
  const archiveReference = req.query?.['archiveReference'];
  const size = req.query?.['size'] ?? 10;

  if (archiveReference) {
    if (UUID_REGEX.test(archiveReference) || ARCHIVE_REF_REGEX.test(archiveReference)) {
      res.json({
        count: 1,
        next: null,
        instances: [makeInstance(org, app, currentTask, isComplete, archiveReference)],
      });
      return;
    }

    res.json({
      count: 0,
      next: null,
      instances: [],
    });
    return;
  }

  res.json({
    count: size,
    next: 'next',
    instances: Array.from({ length: size }, () => makeInstance(org, app, currentTask, isComplete)),
  });
};

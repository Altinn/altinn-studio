import { v4 as uuid } from 'uuid';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ARCHIVE_REF_REGEX = /^[0-9a-f]{12}$/i;

export const storageApplicationMetadataRoute = async (req, res) => {
  res.json({});
};
export const storageTextsRoute = async (req, res) => {
  res.json({});
};

class NoResultsError extends Error {}

const taskNames = { Task_1: 'Utfylling' };

function makeInstance(
  org,
  app,
  currentTask,
  isComplete,
  isConfirmed,
  isSoftDeleted,
  isHardDeleted,
  archiveReference = null,
) {
  // Check illogical filters

  if (
    archiveReference &&
    !UUID_REGEX.test(archiveReference) &&
    !ARCHIVE_REF_REGEX.test(archiveReference)
  ) {
    throw new NoResultsError();
  }

  if (isComplete === true && currentTask != null) {
    throw new NoResultsError();
  }

  if (isConfirmed === true && (isComplete === false || currentTask != null)) {
    throw new NoResultsError();
  }

  if (
    isSoftDeleted === true &&
    (isConfirmed === false || isComplete === false || currentTask != null)
  ) {
    throw new NoResultsError();
  }

  if (
    isHardDeleted === true &&
    (isConfirmed === false || isComplete === false || currentTask != null)
  ) {
    throw new NoResultsError();
  }

  if (isHardDeleted === true && isSoftDeleted === true) {
    throw new NoResultsError();
  }

  // Perform logical constraints

  if (isSoftDeleted === true || isHardDeleted === true) {
    isConfirmed = true;
  }

  if (isConfirmed === true) {
    isComplete = true;
  }

  if (isComplete === false) {
    currentTask ??= 'Task_1';
  }

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
  isConfirmed = isConfirmed == null ? Math.random() < 0.5 : isConfirmed;
  isSoftDeleted = isConfirmed && isSoftDeleted == null ? Math.random() < 0.5 : isSoftDeleted;
  isHardDeleted =
    isConfirmed && !isSoftDeleted && isHardDeleted == null ? Math.random() < 0.5 : isHardDeleted;

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

function parseBoolParam(param) {
  if (param === 'true') {
    return true;
  }
  if (param === 'false') {
    return false;
  }
  return null;
}

export const storageInstancesRoute = (req, res) => {
  const { org, app } = req.params;
  const currentTask = req.query?.['process.currentTask'];
  const isComplete = parseBoolParam(req.query?.['process.isComplete']);
  const isConfirmed = parseBoolParam(req.query?.['confirmed']);
  const isSoftDeleted = parseBoolParam(req.query?.['status.isSoftDeleted']);
  const isHardDeleted = parseBoolParam(req.query?.['status.isHardDeleted']);
  const archiveReference = req.query?.['archiveReference'];
  const size = req.query?.['size'] ?? 10;

  try {
    if (archiveReference) {
      res.json({
        count: 1,
        next: null,
        instances: [
          makeInstance(
            org,
            app,
            currentTask,
            isComplete,
            isConfirmed,
            isSoftDeleted,
            isHardDeleted,
            archiveReference,
          ),
        ],
      });
    } else {
      res.json({
        count: size,
        next: 'next',
        instances: Array.from({ length: size }, () =>
          makeInstance(
            org,
            app,
            currentTask,
            isComplete,
            isConfirmed,
            isSoftDeleted,
            isHardDeleted,
          ),
        ),
      });
    }
  } catch (error) {
    if (error instanceof NoResultsError) {
      res.json({
        count: 0,
        next: null,
        instances: [],
      });
    } else {
      throw error;
    }
  }
};

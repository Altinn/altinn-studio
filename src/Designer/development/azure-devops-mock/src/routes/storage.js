import { v4 as uuid } from 'uuid';

export const storageApplicationMetadataRoute = async (req, res) => {
  res.json({});
};
export const storageTextsRoute = async (req, res) => {
  res.json({});
};

const taskNames = { Task_1: 'Utfylling' };

function makeInstance(org, app, currentTask, isComplete) {
  if (currentTask == null && isComplete == null) {
    if (Math.random() < 0.5) {
      currentTask = 'Task_1';
    } else {
      isComplete = true;
    }
  }

  if (currentTask) {
    return {
      id: uuid(),
      org,
      app,
      isRead: true,
      currentTaskName: taskNames[currentTask],
      currentTaskId: currentTask,
      createdAt: new Date(),
      lastChangedAt: new Date(),
    };
  }

  if (isComplete) {
    return {
      id: uuid(),
      org,
      app,
      isRead: true,
      archivedAt: new Date(),
      createdAt: new Date(),
      lastChangedAt: new Date(),
    };
  }
}

export const storageInstancesRoute = (req, res) => {
  const { org, app } = req.params;
  const currentTask = req.query['process.currentTask'];
  const isComplete = req.query['process.isComplete'];
  const size = req.query['size'] ?? 10;

  res.json({
    count: 1,
    self: '',
    next: 'next',
    instances: Array.from({ length: size }, () => makeInstance(org, app, currentTask, isComplete)),
  });
};

type QueueTask = {
  id: string;
  callback: Function;
};

type QueueOptions = {
  timeout?: number;
};

export class Queue {
  private queue: QueueTask[] = [];
  private queueTimeoutId: NodeJS.Timeout | undefined;
  private readonly options: QueueOptions | undefined;

  constructor(options: QueueOptions) {
    this.options = options;
  }

  public addTaskToQueue(queueTask: QueueTask): void {
    const alreadyInQueue = this.queue.find((task) => task.id === queueTask.id);
    if (alreadyInQueue) return;

    this.queue.push(queueTask);
    this.resetTimeOutQueue();
    this.startProcessingQueue();
  }

  private resetTimeOutQueue(): void {
    clearTimeout(this.queueTimeoutId);
  }

  private startProcessingQueue(): void {
    this.queueTimeoutId = setTimeout(() => {
      this.queue.forEach((task) => task.callback());
      this.queue = [];
      this.queueTimeoutId = undefined;
    }, this.options.timeout || 1000);
  }
}

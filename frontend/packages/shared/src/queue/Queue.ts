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
    console.log({ queueTask, queue: this.queue });
    if (this.queue.find((task) => task.id === queueTask.id)) {
      console.log('already added to queue');
      return;
    }
    this.queue.push(queueTask);
    this.resetTimeOutQueue();
    this.startProcessingQueue();
  }

  private resetTimeOutQueue() {
    console.log('resetTimeOutQueue');
    clearTimeout(this.queueTimeoutId);
  }

  private startProcessingQueue() {
    this.queueTimeoutId = setTimeout(
      () =>
        this.queue.forEach((task) => {
          task.callback();
        }),
      this.options.timeout || 1000,
    );
  }
}

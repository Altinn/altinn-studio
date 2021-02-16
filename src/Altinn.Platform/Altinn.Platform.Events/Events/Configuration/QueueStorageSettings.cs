namespace Altinn.Platform.Events.Configuration
{
    /// <summary>
    /// Configuration object used to hold settings for the queue storage.
    /// </summary>
    public class QueueStorageSettings
    {
        /// <summary>
        /// ConnectionString for the storage account
        /// </summary>
        public string ConnectionString { get; set; }

        /// <summary>
        /// Name of the queue to push events to.
        /// </summary>
        public string QueueName { get; set; }

        /// <summary>
        /// Indicated if events should be pushed to queue.
        /// </summary>
        public bool EnablePushToQueue { get; set; }
    }
}

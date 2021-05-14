using System.Threading.Tasks;

using Altinn.Platform.Events.Models;

namespace Altinn.Platform.Events.Services.Interfaces
{
    /// <summary>
    /// Interface to interact with the queue
    /// </summary>
    public interface IQueueService
    {
        /// <summary>
        /// Pushes the provided content to the queue
        /// </summary>
        /// <param name="content">The content to push to the queue in string format</param>
        /// <returns>Returns a queue receipt</returns>
        public Task<PushQueueReceipt> PushToQueue(string content);

        /// <summary>
        /// Pushes the provided content to the queue
        /// </summary>
        /// <param name="content">The content to push to the queue in string format</param>
        /// <returns>Returns a queue receipt</returns>
        public Task<PushQueueReceipt> PushToOutboundQueue(string content);

        /// <summary>
        /// Pushes the provided content to the queue
        /// </summary>
        /// <param name="content">The content to push to the queue in string format</param>
        /// <returns>Returns a queue receipt</returns>
        public Task<PushQueueReceipt> PushToValidationQueue(string content);
    }
}

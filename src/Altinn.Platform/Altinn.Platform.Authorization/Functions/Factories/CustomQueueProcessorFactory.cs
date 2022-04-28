using System;
using System.Threading;
using System.Threading.Tasks;
using Azure.Storage.Queues.Models;
using Microsoft.Azure.WebJobs.Host.Executors;
using Microsoft.Azure.WebJobs.Host.Queues;

namespace Altinn.Platform.Authorization.Functions.Factories;

/// <summary>
/// Factory to produce a custom queue processor that staggers retries. This overloads the settings controlling queue retry behaviour set in host.json
/// </summary>
/// <seealso cref="IQueueProcessorFactory" />
public class CustomQueueProcessorFactory : IQueueProcessorFactory
{
    /// <summary>
    /// Creates a <see cref="T:Microsoft.Azure.WebJobs.Host.Queues.QueueProcessor" /> using the specified options.
    /// </summary>
    /// <param name="queueProcessorOptions">The <see cref="T:Microsoft.Azure.WebJobs.Host.Queues.QueueProcessorOptions" /> to use.</param>
    /// <returns>
    /// A <see cref="T:Microsoft.Azure.WebJobs.Host.Queues.QueueProcessor" /> instance.
    /// </returns>
    public QueueProcessor Create(QueueProcessorOptions queueProcessorOptions)
    {
        queueProcessorOptions.Options.MaxDequeueCount = 5;
        queueProcessorOptions.Options.VisibilityTimeout = TimeSpan.FromSeconds(5);

        return new CustomQueueProcessor(queueProcessorOptions);
    }

    /// <summary>
    /// Custom QueueProcessor demonstrating some of the virtuals that can be overridden
    /// to customize queue processing.
    /// </summary>
    private class CustomQueueProcessor : QueueProcessor
    {
        public CustomQueueProcessor(QueueProcessorOptions queueProcessorOptions)
            : base(queueProcessorOptions)
        {
        }

        protected override async Task ReleaseMessageAsync(
            QueueMessage message,
            FunctionResult result,
            TimeSpan visibilityTimeout,
            CancellationToken cancellationToken)
        {
            visibilityTimeout = message.DequeueCount switch
            {
                1 => TimeSpan.FromSeconds(1),
                2 => TimeSpan.FromSeconds(3),
#if DEBUG
                3 => TimeSpan.FromSeconds(3),
                4 => TimeSpan.FromSeconds(3),
                5 => TimeSpan.FromSeconds(3),
#else
                    3 => TimeSpan.FromSeconds(7),
                    4 => TimeSpan.FromMinutes(1),
                    5 => TimeSpan.FromMinutes(5),
#endif
                _ => visibilityTimeout,
            };

            await base.ReleaseMessageAsync(message, result, visibilityTimeout, cancellationToken);
        }
    }
}

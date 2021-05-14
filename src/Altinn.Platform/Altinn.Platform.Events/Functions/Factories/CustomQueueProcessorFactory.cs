using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Azure.Storage.Queue;
using Microsoft.Azure.WebJobs.Host.Executors;
using Microsoft.Azure.WebJobs.Host.Queues;

namespace Altinn.Platform.Events.Functions.Factories
{
    /// <summary>
    /// Custom QueueProcessorFactory 
    /// </summary>
    public class CustomQueueProcessorFactory : IQueueProcessorFactory
    {
        /// <inheritdoc/>
        public QueueProcessor Create(QueueProcessorFactoryContext context)
        {
            if (context.Queue.Name == "events-outbound" ||
                context.Queue.Name == "subscription-validation")
            {
                return new CustomQueueProcessor(context);
            }

            // return the default processor
            return new QueueProcessor(context);
        }

        private class CustomQueueProcessor : QueueProcessor
        {
            public CustomQueueProcessor(QueueProcessorFactoryContext context)
                : base(context)
            {
                MaxDequeueCount = 12;
            }

            public override Task<bool> BeginProcessingMessageAsync(CloudQueueMessage message, CancellationToken cancellationToken)
            {
                return base.BeginProcessingMessageAsync(message, cancellationToken);
            }

            public override Task CompleteProcessingMessageAsync(CloudQueueMessage message, FunctionResult result, CancellationToken cancellationToken)
            {
                return base.CompleteProcessingMessageAsync(message, result, cancellationToken);
            }

            protected override async Task ReleaseMessageAsync(CloudQueueMessage message, FunctionResult result, TimeSpan visibilityTimeout, CancellationToken cancellationToken)
            {
                visibilityTimeout = message.DequeueCount switch
                {
                    1 => TimeSpan.FromSeconds(10),
                    2 => TimeSpan.FromSeconds(30),
                    3 => TimeSpan.FromMinutes(1),
                    4 => TimeSpan.FromMinutes(5),
                    5 => TimeSpan.FromMinutes(10),
                    6 => TimeSpan.FromMinutes(30),
                    7 => TimeSpan.FromHours(1),
                    8 => TimeSpan.FromHours(3),
                    9 => TimeSpan.FromHours(6),
                    10 => TimeSpan.FromHours(12),
                    11 => TimeSpan.FromHours(12),
                    _ => visibilityTimeout,
                };

                await base.ReleaseMessageAsync(message, result, visibilityTimeout, cancellationToken);
            }
        }
    }
}

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Azure.Storage.Queues.Models;
using Microsoft.Azure.WebJobs.Host.Executors;
using Microsoft.Azure.WebJobs.Host.Queues;
using Microsoft.WindowsAzure.Storage.Queue;

namespace Altinn.Platform.Authorization.Functions.Factories
{
    public class CustomQueueProcessorFactory : IQueueProcessorFactory
    {
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


            protected override async Task ReleaseMessageAsync(QueueMessage message, FunctionResult result,
                TimeSpan visibilityTimeout, CancellationToken cancellationToken)
            {

                visibilityTimeout = message.DequeueCount switch
                {
                    1 => TimeSpan.FromSeconds(1),
                    2 => TimeSpan.FromSeconds(3),
                    3 => TimeSpan.FromSeconds(7),
                    4 => TimeSpan.FromMinutes(1),
                    5 => TimeSpan.FromMinutes(5),
                    _ => visibilityTimeout,
                };

                await base.ReleaseMessageAsync(message, result, visibilityTimeout, cancellationToken);
            }
        }
    }
}

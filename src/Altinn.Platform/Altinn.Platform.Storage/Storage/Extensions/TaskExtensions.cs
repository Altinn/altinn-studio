using System;
using System.Threading;
using System.Threading.Tasks;

namespace Altinn.Platform.Storage.Extensions
{
    /// <summary>
    /// Extension methods related to Tasks.
    /// </summary>
    public static class TaskExtensions
    {
        /// <summary>
        /// Extension method to support cancellation/break when token is cancelled in calling context.
        /// The task parameter will still continue to execute, but the caller will receive OperationCanceledException as usual.
        /// Taken from @davidfowl's excellent async guidance:
        /// https://github.com/davidfowl/AspNetCoreDiagnosticScenarios/blob/a87d6b804d8924e8487f3bf79f37fe9973049649/AsyncGuidance.md#cancelling-uncancellable-operations
        /// </summary>
        /// <typeparam name="T">Task type parameter.</typeparam>
        /// <param name="task">Task.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns></returns>
        public static async Task<T> WithCancellation<T>(this Task<T> task, CancellationToken cancellationToken)
        {
            var tcs = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);

            using (cancellationToken.Register(state => ((TaskCompletionSource)state).TrySetResult(), tcs))
            {
                var resultTask = await Task.WhenAny(task, tcs.Task);
                if (resultTask == tcs.Task)
                {
                    throw new OperationCanceledException(cancellationToken);
                }

                return await task;
            }
        }
    }
}

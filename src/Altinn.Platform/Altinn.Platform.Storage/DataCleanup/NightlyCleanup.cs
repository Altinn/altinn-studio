using System;

using Microsoft.Azure.WebJobs;
using Microsoft.Extensions.Logging;

namespace Altinn.Platform.Storage.DataCleanup
{
    /// <summary>
    /// Azure Function class for handling tasks related to nightly data cleanup.
    /// </summary>
    public class NightlyCleanup
    {
        /// <summary>
        /// Runs nightly cleanup.
        /// </summary>
        /// <param name="timer">The trigger timer.</param>
        /// <param name="log">The log</param>
        [FunctionName("NightlyCleanup")]
        public static void Run([TimerTrigger("0 0 */1 * * 1-5")]TimerInfo timer, ILogger log)
        {
        }
    }
}

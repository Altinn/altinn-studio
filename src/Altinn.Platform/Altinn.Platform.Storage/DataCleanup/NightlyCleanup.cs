using System;

using Microsoft.Azure.WebJobs;
using Microsoft.Extensions.Logging;

namespace Altinn.Platform.Storage.DataCleanup
{
    public class NightlyCleanup
    {
        [FunctionName("NightlyCleanup")]
        public static void Run([TimerTrigger("* */15 * * * 1-5")]TimerInfo timer, ILogger log)
        {
            log.LogInformation($"C# Timer trigger function executed at: {DateTime.Now}");
        }
    }
}

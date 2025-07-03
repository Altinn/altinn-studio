using System.Threading.Tasks;
using Azure;
using Azure.Identity;
using Azure.Monitor.Query;
using Azure.Monitor.Query.Models;
using KubernetesWrapper.Models;
using KubernetesWrapper.Services.Interfaces;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace KubernetesWrapper.Services.Implementation
{
    /// <summary>
    ///  Service containing all actions related to application logs
    /// </summary>
    /// <remarks>
    /// Initializes a new instance of the <see cref="ApplicationLogsService"/> class
    /// </remarks>
    /// <param name="configuration">The configuration</param>
    [Route("api/v1/[controller]")]
    [ApiController]
    public class ApplicationLogsService(IConfiguration configuration) : IApplicationLogsService
    {
        /// <summary>
        /// Get the list of application logs
        /// </summary>
        /// <param name="app">app</param>
        /// <param name="take">take</param>
        /// <param name="time">time</param>
        /// <returns>The list of application logs</returns>
        [HttpGet]
        [EnableCors]
        public async Task<IEnumerable<Log>> GetLogs(string app = null, double take = 50, double time = 1)
        {
            string applicationLawWorkspaceId = configuration["ApplicationLawWorkspaceId"];

            if (string.IsNullOrWhiteSpace(applicationLawWorkspaceId))
            {
                throw new InvalidOperationException("Configuration value 'ApplicationLawWorkspaceId' is missing or empty.");
            }

            var client = new LogsQueryClient(new DefaultAzureCredential());

            string appNameFilter = string.IsNullOrWhiteSpace(app)
                ? string.Empty
                : $" | where AppRoleName has '{app}'";

            var query = $@"
                AppExceptions{appNameFilter}
                | project TimeGenerated, Details
                | take {take}";

            Response<LogsQueryResult> response = await client.QueryWorkspaceAsync(applicationLawWorkspaceId, query, new QueryTimeRange(TimeSpan.FromHours(time)));

            return response.Value.Table.Rows.Select(row => new Log
            {
                TimeGenerated = row.GetDateTimeOffset("TimeGenerated")?.UtcDateTime ?? DateTime.MinValue,
                Message = row.GetString("Details") ?? string.Empty,
            });
        }
    }
}

using Azure.Identity;
using Azure.Monitor.Query;

using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace KubernetesWrapper.Controllers
{
    /// <summary>
    ///  Controller containing all actions related to kubernetes logs
    /// </summary>
    /// <remarks>
    /// Initializes a new instance of the <see cref="OperationalLogsController"/> class
    /// </remarks>
    /// <param name="logger">The logger</param>
    /// <param name="configuration">The configuration</param>
    [Route("api/v1/[controller]")]
    [ApiController]
    public class OperationalLogsController(ILogger<OperationalLogsController> logger, IConfiguration configuration) : ControllerBase
    {
        /// <summary>
        /// Get a list of logs. For a more detailed spec of parameters see Kubernetes API DOC
        /// </summary>
        /// <param name="app">app</param>
        /// <param name="take">take</param>
        /// <param name="time">hours</param>
        /// <returns>A list of logs in the cluster</returns>
        [HttpGet]
        [EnableCors]
        public ActionResult GetLogs(string app = null, double take = 50, double time = 24)
        {
            try
            {
                string operationalLawWorkspaceId = configuration["OperationalLawWorkspaceId"];

                if (string.IsNullOrWhiteSpace(operationalLawWorkspaceId))
                {
                    throw new InvalidOperationException("Configuration value 'OperationalLawWorkspaceId' is missing or empty.");
                }

                var client = new LogsQueryClient(new DefaultAzureCredential());

                /*"| serialize | extend RowNumber = row_number() | order by RowNumber asc " +*/
                /*"| summarize Logs = strcat_array(make_list(LogMessage, 1000), \"\\n\") by ContainerId " +*/
                /*| summarize Logs = make_list(LogMessage, 1000) by ContainerId*/
                /*| summarize Logs = strcat_array(make_list(LogMessage, 1000), '\n') by ContainerId*/

                string appNameFilter = string.IsNullOrWhiteSpace(app)
                    ? string.Empty
                    : $" | where PodName has '{app}'";

                var query = $@"
                    ContainerLogV2{appNameFilter}
                    | where LogSource == 'stderr'
                    | where ContainerName == 'deployment'
                    | serialize | extend RowNumber = row_number() | order by RowNumber asc
                    | project TimeGenerated, LogMessage
                    | take {take}";

                var response = client.QueryWorkspace(operationalLawWorkspaceId, query, new QueryTimeRange(TimeSpan.FromHours(time)));

                /* return Ok(response.Value.AllTables.Select(table => table.Rows.Select(row => table.Columns.Select((col, i) => new KeyValuePair<string, object>(col.Name, col.Name == "LogMessage" ? row[i]?.ToString() : row[i]))))); */

                return Ok(response.Value.AllTables.Select(table => table.Rows.Select(row => new
                {
                    LogMessage = row["LogMessage"]?.ToString()
                })));
            }
            catch (Exception e)
            {
                logger.LogError(e, "Unable to get Logs");
                return StatusCode(500);
            }
        }
    }
}

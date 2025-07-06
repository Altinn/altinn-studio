using KubernetesWrapper.Models;

namespace KubernetesWrapper.Services.Interfaces
{
    /// <summary>
    /// Interface for the operational logs service
    /// </summary>
    public interface IOperationalLogsService
    {
        /// <summary>
        /// Get the list of operational logs
        /// </summary>
        /// <param name="app">app</param>
        /// <param name="take">take</param>
        /// <param name="time">time</param>
        /// <returns>The list of operational logs</returns>
        Task<IEnumerable<Log>> GetLogs(string app, int take, double time);
    }
}

using KubernetesWrapper.Models;

namespace KubernetesWrapper.Services.Interfaces
{
    /// <summary>
    /// Interface for the application logs service
    /// </summary>
    public interface IApplicationLogsService
    {
        /// <summary>
        /// Get the list of application logs
        /// </summary>
        /// <param name="app">app</param>
        /// <param name="take">take</param>
        /// <param name="time">time</param>
        /// <returns>The list of application logs</returns>
        Task<IEnumerable<Log>> GetLogs(string app, double take, double time);
    }
}

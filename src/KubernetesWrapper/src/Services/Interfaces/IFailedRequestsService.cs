using KubernetesWrapper.Models;

namespace KubernetesWrapper.Services.Interfaces
{
    /// <summary>
    /// Interface for the failed requests service
    /// </summary>
    public interface IFailedRequestsService
    {
        /// <summary>
        /// Get the list of failed requests
        /// </summary>
        /// <param name="app">app</param>
        /// <param name="take">take</param>
        /// <param name="time">time</param>
        /// <returns>The list of failed requests</returns>
        Task<IEnumerable<Request>> GetRequests(string app, double take, double time);
    }
}

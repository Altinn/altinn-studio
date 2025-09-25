using Altinn.Platform.Storage.Models;

namespace Altinn.Platform.Storage.Services
{
    /// <summary>
    /// This interface describes the required methods and features of a application service implementation.
    /// </summary>
    public interface IApplicationService
    {
        /// <summary>
        /// Check if a datatype is valid for given app
        /// </summary>
        /// <param name="org">The application owner id.</param>
        /// <param name="appId">The id of the application.</param>
        /// <param name="dataType">The data type identifier for the data being uploaded.</param>
        /// <param name="currentTask">The task info of the currentTask of an ongoing process.</param>
        /// <returns>Result of validation. If the result (IsValid) is false, it will be described in ServiceError</returns>
        Task<(bool IsValid, ServiceError ServiceError)> ValidateDataTypeForApp(string org, string appId, string dataType, string currentTask);
    }
}
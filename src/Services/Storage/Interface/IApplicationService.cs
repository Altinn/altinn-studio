using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;

namespace Altinn.Platform.Storage.Services
{
    /// <summary>
    /// This interface describes the required methods and features of a application service implementation.
    /// </summary>
    public interface IApplicationService
    {
        /// <summary>
        /// Upload file and save dataElement
        /// </summary>
        /// <param name="org">The application owner id.</param>
        /// <param name="appId">The id of the application.</param>
        /// <param name="dataType">The data type identifier for the data being uploaded.</param>
         Task<(bool IsValid, ServiceError ServiceError)> ValidateDataTypeForApp(string org, string appId, string dataType);
    }
}
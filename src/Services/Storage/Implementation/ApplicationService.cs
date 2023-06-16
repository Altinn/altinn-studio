using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Models;
using Altinn.Platform.Storage.Repository;

namespace Altinn.Platform.Storage.Services
{
    /// <summary>
    /// Service class with business logic related to applications.
    /// </summary>
    public class ApplicationService : IApplicationService
    {
        private readonly IApplicationRepository _applicationRepository;

        /// <summary>
        /// Initializes a new instance of the <see cref="ApplicationService"/> class.
        /// </summary>
        public ApplicationService(IApplicationRepository applicationRepository)
        {
            _applicationRepository = applicationRepository;
        }

        /// <inheritdoc/>
        public async Task<(bool IsValid, ServiceError ServiceError)> ValidateDataTypeForApp(string org, string appId, string dataType, string currentTask)
        {
            Application application = await _applicationRepository.FindOne(appId, org);

            if (application == null)
            {
                return (false, new ServiceError(404, $"Cannot find application {appId} in storage"));
            }

            if (application.DataTypes.Exists(e => e.Id == dataType && (string.IsNullOrEmpty(e.TaskId) || e.TaskId == currentTask)))
            {
                return (true, null);
            }

            return (false, new ServiceError(405, $"DataType {dataType} is not declared in application metadata for app {appId}"));
        }
    }
}
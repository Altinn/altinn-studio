#nullable disable

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

            if (application.DataTypes.Exists(e => e.Id == dataType && IsAllowedInTask(e, currentTask)))
            {
                return (true, null);
            }

            return (false, new ServiceError(405, $"DataType {dataType} is not declared in application metadata for app {appId}"));
        }

        /// <inheritdoc/>
        public async Task<(Application Application, ServiceError ServiceError)> GetApplicationOrErrorAsync(string appId)
        {
            string org = appId.Split('/')[0];
            Application application = await _applicationRepository.FindOne(appId, org);

            if (application == null)
            {
                return (null, new ServiceError(404, $"Cannot find application {appId} in storage"));
            }

            return (application, null);
        }

        private static bool IsAllowedInTask(DataType dataType, string task)
        {
            if (dataType.TaskIds is not null)
            {
                return dataType.TaskIds.Count == 0 || dataType.TaskIds.Contains(task);
            }

            // v8 apps upload taskId instead of taskIds.
#pragma warning disable CS0618 // Type or member is obsolete
            return string.IsNullOrEmpty(dataType.TaskId) || dataType.TaskId == task;
#pragma warning restore CS0618 // Type or member is obsolete
        }
    }
}
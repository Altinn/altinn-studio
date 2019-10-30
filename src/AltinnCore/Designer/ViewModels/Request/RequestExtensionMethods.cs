using AltinnCore.Designer.Repository.Models;
using AltinnCore.Designer.Services.Models;

namespace AltinnCore.Designer.ViewModels.Request
{
    /// <summary>
    /// Contains extension methods that converts from one model to another
    /// </summary>
    public static class RequestExtensionMethods
    {
        /// <summary>
        /// Converts from CreateReleaseRequestViewModel to ReleaseEntity
        /// </summary>
        /// <param name="viewmodel">CreateReleaseRequestViewModel</param>
        /// <returns></returns>
        public static ReleaseEntity ToEntityModel(this CreateReleaseRequestViewModel viewmodel)
            => new ReleaseEntity
            {
                Body = viewmodel.Body,
                Name = viewmodel.Name,
                TagName = viewmodel.TagName,
                TargetCommitish = viewmodel.TargetCommitish
            };

        /// <summary>
        /// Converts from UpdateReleaseRequestViewModel to ReleaseEntity
        /// </summary>
        /// <param name="viewmodel">UpdateReleaseRequestViewModel</param>
        /// <returns></returns>
        public static ReleaseEntity ToEntityModel(this UpdateReleaseRequestViewModel viewmodel)
            => new ReleaseEntity
            {
                Build = new BuildEntity
                {
                    Id = viewmodel.Id,
                    Status = viewmodel.Status,
                    Result = viewmodel.Result,
                    Started = viewmodel.Started,
                    Finished = viewmodel.Finished
                }
            };

        /// <summary>
        /// Converts from CreateDeploymentRequestViewModel to DeploymentModel
        /// </summary>
        /// <param name="viewmodel">CreateDeploymentRequestViewModel</param>
        /// <returns></returns>
        public static DeploymentModel ToDomainModel(this CreateDeploymentRequestViewModel viewmodel)
            => new DeploymentModel
            {
                TagName = viewmodel.TagName,
                Environment = viewmodel.Environment
            };
    }
}

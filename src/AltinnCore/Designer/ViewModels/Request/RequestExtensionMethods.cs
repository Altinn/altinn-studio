using System;
using AltinnCore.Designer.Repository.Models;

namespace AltinnCore.Designer.ViewModels.Request
{
    /// <summary>
    /// Contains extension methods that converts from one model to another
    /// </summary>
    public static class RequestExtensionMethods
    {
        /// <summary>
        /// Converts from CreateReleaseRequestViewModel to ReleaseDocument
        /// </summary>
        /// <param name="viewmodel">CreateReleaseRequestViewModel</param>
        /// <returns></returns>
        public static ReleaseDocument ToDocumentModel(this CreateReleaseRequestViewModel viewmodel)
            => new ReleaseDocument
            {
                Created = DateTime.Now,
                Body = viewmodel.Body,
                Name = viewmodel.Name,
                TagName = viewmodel.TagName,
                TargetCommitish = viewmodel.TargetCommitish
            };

        /// <summary>
        /// Converts from UpdateReleaseRequestViewModel to ReleaseDocument
        /// </summary>
        /// <param name="viewmodel">UpdateReleaseRequestViewModel</param>
        /// <returns></returns>
        public static ReleaseDocument ToDocumentModel(this UpdateReleaseRequestViewModel viewmodel)
            => new ReleaseDocument
            {
                TargetCommitish = viewmodel.TargetCommitish,
                Build = new BuildDocument
                {
                    Status = viewmodel.Status,
                    Started = viewmodel.Started,
                    Finished = viewmodel.Finished
                }
            };
    }
}

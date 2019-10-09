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
        /// Converts from ReleaseRequestViewModel to ReleaseDocument
        /// </summary>
        /// <param name="viewmodel">ViewModel</param>
        /// <param name="app">App</param>
        /// <param name="org">Org</param>
        /// <returns></returns>
        public static ReleaseDocument ToDocumentModel(this ReleaseRequestViewModel viewmodel, string app, string org)
            => new ReleaseDocument
            {
                Created = DateTime.Now,
                Org = org,
                App = app,
                Body = viewmodel.Body,
                Name = viewmodel.Name,
                TagName = viewmodel.TagName,
                TargetCommitish = viewmodel.TargetCommitish
            };
    }
}

using System.Collections.Generic;
using System.Xml.Linq;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Models;
using Altinn.App.Services.Models.Workflow;
using Altinn.Platform.Storage.Models;

namespace Altinn.App.Services.Interface
{
    /// <summary>
    /// Interface for repository functionality
    /// </summary>
    public interface IRepository
    {
        /// <summary>
        /// Returns the <see cref="ServiceMetadata"/> for an app.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The service metadata for an app.</returns>
        ServiceMetadata.ServiceMetadata GetServiceMetaData(string org, string app);

        /// <summary>
        /// Returns the workflow of an app.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The list of workflow steps</returns>
        List<WorkFlowStep> GetWorkFlow(string org, string app);

        /// <summary>
        /// Returns the application metadata for an application.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The application  metadata for an application.</returns>
        Application GetApplication(string org, string app);

        /// <summary>
        /// Gets the prefill json file
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="dataModelName">the data model name</param>
        /// <returns></returns>
        string GetPrefillJson(string org, string app, string dataModelName = "ServiceModel");
    }
}

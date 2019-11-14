using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Services.Interface
{
    /// <summary>
    /// Interface for execution functionality
    /// </summary>
    public interface IExecution
    {
        /// <summary>
        /// Get the app resource for the given parameters.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="resource">the resource.</param>
        /// <returns>The app resource.</returns>
        byte[] GetAppResource(string org, string app, string resource);



        /// <summary>
        /// Get the app resource for the given parameters.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="resource">the resource.</param>
        /// <returns>The app resource.</returns>
        byte[] GetText(string org, string app, string textResource);


        /// <summary>
        /// Returns the ServiceMetadata for an app.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The ServiceMetadata for an app.</returns>
        ServiceMetadata.ServiceMetadata GetServiceMetaData(string org, string app);

        /// <summary>
        /// Method that fetches the runtime resources stored in wwwroot
        /// </summary>
        /// <param name="resource">the resource</param>
        /// <returns>The filestream for the resource file</returns>
        byte[] GetRuntimeResource(string resource);

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

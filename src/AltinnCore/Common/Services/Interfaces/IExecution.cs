using System;
using System.IO;
using AltinnCore.ServiceLibrary.Models;
using AltinnCore.ServiceLibrary.ServiceMetadata;
using AltinnCore.ServiceLibrary.Services.Interfaces;

namespace AltinnCore.Common.Services.Interfaces
{
    /// <summary>
    /// Interface for execution functionality
    /// </summary>
    public interface IExecution
    {
        /// <summary>
        /// Returns the ServiceImplementation for an app.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="startAppFlag">Flag to determine if the app should run/re-run.</param>
        /// <returns>The ServiceImplementation.</returns>
        IServiceImplementation GetServiceImplementation(string org, string app, bool startAppFlag);

        /// <summary>
        /// Returns the ServiceContext.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="startAppFlag">Flag to determine if the app should run/re-run.</param>
        /// <returns>The ServiceContext.</returns>
        ServiceContext GetServiceContext(string org, string app, bool startAppFlag);

        /// <summary>
        /// Returns a new instanceId for an app.
        /// </summary>
        /// <returns>The instanceId.</returns>
        Guid GetNewServiceInstanceID();

        /// <summary>
        /// Gets the raw content of a code list.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="name">The name of the code list to retrieve.</param>
        /// <returns>Raw contents of a code list file.</returns>
        string GetCodelist(string org, string app, string name);

        /// <summary>
        /// Get the app resource for the given parameters.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="resource">the resource.</param>
        /// <returns>The app resource.</returns>
        byte[] GetServiceResource(string org, string app, string resource);

        /// <summary>
        /// Returns the ServiceMetadata for an app.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The ServiceMetadata for an app.</returns>
        ServiceMetadata GetServiceMetaData(string org, string app);

        /// <summary>
        /// Method that fetches the runtime resources stored in wwwroot
        /// </summary>
        /// <param name="resource">the resource</param>
        /// <returns>The filestream for the resource file</returns>
        byte[] GetRuntimeResource(string resource);
    }
}

using System;
using System.IO;
using AltinnCore.ServiceLibrary.Models;
using AltinnCore.ServiceLibrary.ServiceMetadata;
using AltinnCore.ServiceLibrary.Services.Interfaces;

namespace AltinnCore.Common.Services.Interfaces
{
    /// <summary>
    /// Interface for the execution service needed for running AltinnCore services.
    /// </summary>
    public interface IExecution
    {
        /// <summary>
        /// Returns the ServiceImplementation for a service.
        /// </summary>
        /// <param name="org">The Organization code for the service owner.</param>
        /// <param name="service">The service code for the current service.</param>
        /// <param name="startServiceFlag">Flag to determine if the service should run/re-run.</param>
        /// <returns>The service implementation.</returns>
        IServiceImplementation GetServiceImplementation(string org, string service, bool startServiceFlag);

        /// <summary>
        /// Returns the serviceContext.
        /// </summary>
        /// <param name="org">The Organization code for the service owner.</param>
        /// <param name="service">The service code for the current service.</param>
        /// <param name="startServiceFlag">Flag to determine if the service should run/re-run.</param>
        /// <returns>The serviceContext.</returns>
        ServiceContext GetServiceContext(string org, string service, bool startServiceFlag);

        /// <summary>
        /// Returns a new instanceId for a service.
        /// </summary>
        /// <returns>The instanceId.</returns>
        Guid GetNewServiceInstanceID();

        /// <summary>
        /// Gets the raw content of a code list.
        /// </summary>
        /// <param name="org">The organization code of the service owner.</param>
        /// <param name="service">The service code of the current service.</param>
        /// <param name="name">The name of the code list to retrieve.</param>
        /// <returns>Raw contents of a code list file.</returns>
        string GetCodelist(string org, string service, string name);

        /// <summary>
        /// Get the resource for the given parameters.
        /// </summary>
        /// <param name="org">the organisation.</param>
        /// <param name="service">the service.</param>
        /// <param name="resource">the resource.</param>
        /// <returns>The service resource.</returns>
        byte[] GetServiceResource(string org, string service, string resource);

        /// <summary>
        /// Returns the service metadata for a service.
        /// </summary>
        /// <param name="org">The Organization code for the service owner.</param>
        /// <param name="service">The service code for the current service.</param>
        /// <returns>The service metadata for a service.</returns>
        ServiceMetadata GetServiceMetaData(string org, string service);

        /// <summary>
        /// Method that fetches the runtime resources stored in wwwroot
        /// </summary>
        /// <param name="resource">the resource</param>
        /// <returns>The filestream for the resource file</returns>
        byte[] GetRuntimeResource(string resource);

        /// <summary>
        /// Method that adds the workflow file to the repository if its not there, or replaces it if its an old version of the workflow file.
        /// </summary>
        /// <param name="applicationOwnerId">The application owner id</param>
        /// <param name="applicationId">The application id</param>
        /// <param name="developer">The developer of the service.</param>
        void CheckAndUpdateWorkflowFile(string applicationOwnerId, string applicationId, string developer);
    }
}

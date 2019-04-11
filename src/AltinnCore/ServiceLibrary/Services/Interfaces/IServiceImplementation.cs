using System;
using System.Threading.Tasks;
using AltinnCore.ServiceLibrary.Enums;
using AltinnCore.ServiceLibrary.Models;
using AltinnCore.ServiceLibrary.ServiceMetadata;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace AltinnCore.ServiceLibrary.Services.Interfaces
{
    /// <summary>
    /// This interface defines all events a service possible can experience
    /// runtime in Altinn Services 3.0. A Service does only need to implement
    /// the relevant methods. All other methods should be empty.
    /// </summary>
    public interface IServiceImplementation
    {
        /// <summary>
        /// Creates a new Instance of the service model
        /// </summary>
        /// <returns>An instance of the service model</returns>
        object CreateNewServiceModel();

        /// <summary>
        /// Sets the current populated service model to the service implementation.
        /// </summary>
        /// <param name="model">The service model to use</param>
        void SetServiceModel(object model);

        /// <summary>
        /// Set context for the current request
        /// </summary>
        /// <param name="requestContext">The current request context</param>
        /// <param name="viewBag">The current view bag</param>
        void SetContext(RequestContext requestContext, dynamic viewBag);

        /// <summary>
        /// Sets the Context 
        /// </summary>
        /// <param name="requestContext">The current request context</param>
        /// <param name="viewBag">The current view bag</param>
        /// <param name="serviceContext">The current service context</param>
        /// <param name="startServiceModel">The start service model</param>
        /// <param name="modelState">The model state</param>
        void SetContext(RequestContext requestContext, dynamic viewBag, ServiceContext serviceContext, StartServiceModel startServiceModel, ModelStateDictionary modelState);

        /// <summary>
        /// Event that is triggered 
        /// </summary>
        /// <param name="serviceEvent">The service event</param>
        /// <returns>Task to indicate when the event is completed</returns>
        Task<bool> RunServiceEvent(ServiceEventType serviceEvent);

        /// <summary>
        /// Set platform service for the current request
        /// </summary>
        /// <param name="platformServices">The current platform services to use</param>
        void SetPlatformServices(IPlatformServices platformServices);

        /// <summary>
        /// Get the service Type
        /// </summary>
        /// <returns>The Type of the service model for the current service</returns>
        Type GetServiceModelType();
    }
}

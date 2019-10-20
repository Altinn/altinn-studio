using System;
using System.Threading.Tasks;
using Altinn.App.Services.Enums;
using Altinn.App.Services.Models;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace Altinn.App.Common.Interface
{
    /// <summary>
    /// This interface defines all events a service possible can experience
    /// runtime in Altinn Services 3.0. A Service does only need to implement
    /// the relevant methods. All other methods should be empty.
    /// </summary>
    public interface IAltinnApp
    {
        /// <summary>
        /// Creates a new Instance of the service model
        /// </summary>
        /// <returns>An instance of the service model</returns>
        object CreateNewServiceModel(string dataModel);

        /// <summary>
        /// Sets the current populated service model to the service implementation.
        /// </summary>
        /// <param name="model">The service model to use</param>
        void SetAppModel(object model);

        /// <summary>
        /// Set context for the current request
        /// </summary>
        /// <param name="requestContext">The current request context</param>
        void SetContext(RequestContext requestContext);

        /// <summary>
        /// Sets the Context 
        /// </summary>
        /// <param name="requestContext">The current request context</param>
        /// <param name="serviceContext">The current service context</param>
        /// <param name="startServiceModel">The start service model</param>
        /// <param name="modelState">The model state</param>
        void SetContext(RequestContext requestContext, ServiceContext serviceContext, StartServiceModel startServiceModel, ModelStateDictionary modelState);

        /// <summary>
        /// Event that is triggered 
        /// </summary>
        /// <param name="serviceEvent">The service event</param>
        /// <returns>Task to indicate when the event is completed</returns>
        Task<bool> RunAppEvent(AppEventType appEvent);

        /// <summary>
        /// Get the service Type
        /// </summary>
        /// <returns>The Type of the service model for the current service</returns>
        Type GetAppModelType(string dataType);
    }
}

using System;
using System.Threading.Tasks;
using Altinn.App.Common.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace Altinn.App.Service.Interface
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
        object CreateNewAppModel(string dataType);

        /// <summary>
        /// Event that is triggered 
        /// </summary>
        /// <param name="serviceEvent">The service event</param>
        /// <returns>Task to indicate when the event is completed</returns>
        Task<bool> RunAppEvent(AppEventType appEvent, object model, ModelStateDictionary modelState = null);

        /// <summary>
        /// Get the service Type
        /// </summary>
        /// <returns>The Type of the service model for the current service</returns>
        Type GetAppModelType(string dataType);

        Task OnInstantiate(Instance instance);
        Task OnStartProcess(string startEvent, Instance instance);
        Task OnStartProcessTask(string taskId, Instance instance);


        /// <summary>
        ///  Check if the current task can be completed.
        /// </summary>        
        /// <returns>true if validation is OK, false otherwise</returns>
        Task<bool> CanEndProcessTask(string taskId, Instance instance);

        /// <summary>
        /// Run application logic for end task.
        /// </summary>
        /// <param name="taskId">task id task to end</param>
        /// <param name="instance">instance data</param>
        Task OnEndProcessTask(string taskId, Instance instance);


        Task OnEndProcess(string endEvent, Instance instance);        

    }
}

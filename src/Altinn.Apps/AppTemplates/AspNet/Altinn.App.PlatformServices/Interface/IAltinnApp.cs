using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Threading.Tasks;
using Altinn.App.Common.Enums;
using Altinn.App.Services.Models;
using Altinn.App.Services.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace Altinn.App.Services.Interface
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
        object CreateNewAppModel(string classRef);

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
        Type GetAppModelType(string classRef);


        Task<string> OnInstantiateGetStartEvent(Instance instance);
        Task OnStartProcess(string startEvent, Instance instance);
        Task OnStartProcessTask(string taskId, Instance instance);

        /// <summary>
        ///  Called before a process task is ended. App can do extra validation logic and add validation issues to collection which will be returned by the controller.
        /// </summary>        
        /// <returns>true task can be ended, false otherwise</returns>
        Task<bool> CanEndProcessTask(string taskId, Instance instance, List<ValidationIssue> validationIssues);

        /// <summary>
        /// Is called after the process task is ended. Method can update instance and data element metadata. 
        /// </summary>
        /// <param name="taskId">task id task to end</param>
        /// <param name="instance">instance data</param>
        Task OnEndProcessTask(string taskId, Instance instance);

        Task OnEndProcess(string endEvent, Instance instance);

        /// <summary>
        /// Is called to run custom validation events defined by app developer.
        /// </summary>
        /// <param name="modelState">The model state</param>
        /// <returns>Task to indicate when validation is completed</returns>
        Task<bool> RunValidation(object instance, ICollection<System.ComponentModel.DataAnnotations.ValidationResult> validationResults);

    }
}

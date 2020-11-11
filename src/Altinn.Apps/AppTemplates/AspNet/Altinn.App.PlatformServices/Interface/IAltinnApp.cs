using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using Altinn.App.Common.Enums;
using Altinn.App.Common.Models;
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
        /// <returns>Task to indicate when the event is completed</returns>
        Task<bool> RunAppEvent(AppEventType appEvent, object model, ModelStateDictionary modelState = null);

        /// <summary>
        /// Get the service Type
        /// </summary>
        /// <returns>The Type of the service model for the current service</returns>
        Type GetAppModelType(string dataType);

        /// <summary>
        /// AppLogic must set the start event of the process model.
        /// </summary>
        /// <returns>the id of the start event</returns>
        Task<string> OnInstantiateGetStartEvent();

        /// <summary>
        /// Callback on first start event of process.
        /// </summary>
        /// <returns></returns>
        Task OnStartProcess(string startEvent, Instance instance);

        /// <summary>
        /// Callback to app after task has been started.
        /// </summary>
        /// <returns></returns>
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

        /// <summary>
        /// Is called when the process for an instance is ended.
        /// </summary>
        Task OnEndProcess(string endEvent, Instance instance);

        /// <summary>
        /// Is called to run custom data validation events defined by app developer.
        /// </summary>
        /// <param name="data">The data to validate</param>
        /// <param name="validationResults">Object containing any validation errors/warnings</param>
        /// <returns>Task to indicate when validation is completed</returns>
        Task RunDataValidation(object data, ModelStateDictionary validationResults);

        /// <summary>
        /// Is called to run custom task validation events defined by app developer.
        /// </summary>
        /// <param name="instance">Instance to be validated.</param>
        /// <param name="taskId">Task id for the current process task.</param>
        /// <param name="validationResults">Object containing any validation errors/warnings</param>
        /// <returns>Task to indicate when validation is completed</returns>
        Task RunTaskValidation(Instance instance, string taskId, ModelStateDictionary validationResults);

        /// <summary>
        /// Is called to run custom calculation events defined by app developer.
        /// </summary>
        /// <param name="data">The data to perform calculations on</param>
        Task<bool> RunCalculation(object data);

        /// <summary>
        /// Is called to run custom instantiation validation defined by app developer.
        /// </summary>
        /// <returns>Task with validation results</returns>
        Task<InstantiationValidationResult> RunInstantiationValidation(Instance instance);

        /// <summary>
        /// Is called to run data creation (custom prefill) defined by app developer.
        /// </summary>
        Task RunDataCreation(Instance instance, object data);

        /// <summary>
        /// Gets the App Options
        /// </summary>
        /// <param name="id">The option id</param>
        /// <param name="options">Possible option found by the platform itself</param>
        /// <returns></returns>
        Task<AppOptions> GetOptions(string id, AppOptions options);

        /// <summary>
        /// Event where app developers can add logic. 
        /// </summary>
        /// <param name="taskId">The taskId</param>
        /// <param name="instance">The instance</param>
        /// <returns></returns>
        Task RunProcessTaskEnd(string taskId, Instance instance);
    }
}

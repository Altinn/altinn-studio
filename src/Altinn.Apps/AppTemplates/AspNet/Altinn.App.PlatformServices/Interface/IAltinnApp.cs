using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;

using Altinn.App.Common.Enums;
using Altinn.App.Common.Models;
using Altinn.App.Services.Models.Validation;
using Altinn.Common.EFormidlingClient.Models.SBD;
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
        Task OnStartProcessTask(string taskId, Instance instance, Dictionary<string, string> prefill);

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
        /// Is called after the process task is abonded. Method can update instance and data element metadata. 
        /// </summary>
        /// <param name="taskId">task id task to end</param>
        /// <param name="instance">instance data</param>
        Task OnAbandonProcessTask(string taskId, Instance instance);

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
        /// Is called to run custom calculation events defined by app developer. Obsolete Replaced by RunProcessDataRead and RunProcessDataWrite
        /// </summary>
        /// <param name="data">The data to perform calculations on</param>
        [Obsolete]
        Task<bool> RunCalculation(object data);

        /// <summary>
        /// Is called to run custom calculation events defined by app developer when data is read from app
        /// </summary>
        /// <param name="instance">Instance that data belongs to</param>
        /// <param name="dataId">Data id for the  data</param>
        /// <param name="data">The data to perform calculations on</param>
        Task<bool> RunProcessDataRead(Instance instance, Guid? dataId, object data);

        /// <summary>
        /// Is called to run custom calculation events defined by app developer when data is written to app
        /// </summary>
        /// <param name="instance">Instance that data belongs to</param>
        /// <param name="dataId">Data id for the  data</param>
        /// <param name="data">The data to perform calculations on</param>
        Task<bool> RunProcessDataWrite(Instance instance, Guid? dataId, object data);

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
        /// Is called to run data creation (custom prefill) defined by app developer. Includes external prefill
        /// </summary>
        Task RunDataCreation(Instance instance, object data, Dictionary<string, string> prefill);

        /// <summary>
        /// Gets the App Options
        /// </summary>
        /// <param name="id">The option id</param>
        /// <param name="options">Possible option found by the platform itself</param>
        /// <returns>The app options</returns>
        [Obsolete("GetOptions method is obsolete and will be removed in the future.", false, UrlFormat = "https://docs.altinn.studio/app/development/data/options/#kodeliste-generert-runtime")]
        Task<AppOptions> GetOptions(string id, AppOptions options);

        /// <summary>
        /// Gets the current page order of the app
        /// </summary>
        /// <param name="org">The app owner.</param>
        /// <param name="app">The app.</param>
        /// <param name="instanceOwnerId">The instance owner partyId</param>
        /// <param name="instanceGuid">The instanceGuid</param>
        /// <param name="layoutSetId">The layout set id</param>
        /// <param name="currentPage">The current page of the instance.</param>
        /// <param name="dataTypeId">The data type id of the current layout.</param>
        /// <param name="formData">The form data.</param>
        /// <returns> The pages in sorted order.</returns>
        virtual async Task<List<string>> GetPageOrder(string org, string app, int instanceOwnerId, Guid instanceGuid, string layoutSetId, string currentPage, string dataTypeId, object formData)
        {
            return await Task.FromResult(new List<string>());
        }

        /// <summary>
        /// Event where app developers can add logic. 
        /// </summary>
        /// <param name="taskId">The taskId</param>
        /// <param name="instance">The instance</param>
        Task RunProcessTaskEnd(string taskId, Instance instance);

        /// <summary>
        /// Format layoutsettings
        /// </summary>
        Task<LayoutSettings> FormatPdf(LayoutSettings layoutSettings, object data);

        /// <summary>
        /// Gets a list of eFormidling shipment receivers
        /// </summary>
        /// <remarks>
        /// Note that the identifier value property on the receiver objects should be prefixed with `0192:` for Norwegian organisations.
        /// </remarks>
        virtual async Task<List<Receiver>> GetEFormidlingReceivers(Instance instance)
        {
            await Task.CompletedTask;
            return null;
        }

        /// <summary>
        /// Generates the metadata document for the eFormidling shipment. e.g. arkivmelding.
        /// </summary>
        /// <remarks>
        /// The metadata file should be parsed to XML before assigning it to the stream.
        /// </remarks>
        /// <returns>A touple containing the metadata file name and the metadata in a stream.</returns>
        virtual async Task<(string, Stream)> GenerateEFormidlingMetadata(Instance instance)
        {
            await Task.CompletedTask;
            return (null, null);
        }
    }
}

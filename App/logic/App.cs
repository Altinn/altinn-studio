using Microsoft.AspNetCore.Mvc.ModelBinding;
using System;
using System.Threading.Tasks;
using Altinn.App.AppLogic.Print;
using Altinn.App.Services.Interface;
using Microsoft.Extensions.Logging;
using Altinn.App.Services.Implementation;
using Altinn.App.AppLogic.Validation;
using Altinn.App.AppLogic.DataProcessing;
using Altinn.App.Services.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.App.PlatformServices.Interface;
using Altinn.App.Common.Models;
using Microsoft.Extensions.Options;
using Microsoft.AspNetCore.Http;
using Altinn.App.Services.Configuration;
using Altinn.App.Models;
using System.Collections.Generic;
using System.Linq;

namespace Altinn.App.AppLogic
{
  public class App : AppBase, IAltinnApp
  {
    private readonly ILogger<App> _logger;
    private readonly ValidationHandler _validationHandler;
    private readonly DataProcessingHandler _dataProcessingHandler;
    private readonly InstantiationHandler _instantiationHandler;
    private readonly IAppResources _appResources;

    public App(
    IAppResources appResourcesService,
    ILogger<App> logger,
    IData dataService,
    IProcess processService,
    IPdfService pdfService,
    IProfile profileService,
    IRegister registerService,
    IPrefill prefillService,
    IInstance instanceService,
    IOptions<GeneralSettings> settings,
    IText textService,
    IHttpContextAccessor httpContextAccessor) : base(
        appResourcesService,
        logger,
        dataService,
        pdfService,
        prefillService,
        registerService,
        profileService,
        instanceService,
        httpContextAccessor)
    {
      _logger = logger;
      _validationHandler = new ValidationHandler(httpContextAccessor);
      _dataProcessingHandler = new DataProcessingHandler();
      _instantiationHandler = new InstantiationHandler(profileService, registerService);
      _appResources = appResourcesService;
    }

    public override object CreateNewAppModel(string classRef)
    {
      _logger.LogInformation($"CreateNewAppModel {classRef}");

      Type appType = Type.GetType(classRef);
      return Activator.CreateInstance(appType);
    }

    public override Type GetAppModelType(string classRef)
    {
      _logger.LogInformation($"GetAppModelType {classRef}");

      return Type.GetType(classRef);
    }    

    /// <summary>
    /// Run data validation event to perform custom validations on data
    /// </summary>
    /// <param name="validationResults">Object to contain any validation errors/warnings</param>
    /// <returns>Value indicating if the form is valid or not</returns>
    public override async Task RunDataValidation(object data, ModelStateDictionary validationResults)
    {
      await _validationHandler.ValidateData(data, validationResults);
    }

    /// <summary>
    /// Run task validation event to perform custom validations on instance
    /// </summary>
    /// <param name="validationResults">Object to contain any validation errors/warnings</param>
    /// <returns>Value indicating if the form is valid or not</returns>
    public override async Task RunTaskValidation(Instance instance, string taskId, ModelStateDictionary validationResults)
    {
      await _validationHandler.ValidateTask(instance, taskId, validationResults);
    }

    /// <summary>
    /// Is called to run custom calculation events defined by app developer when data is read from app
    /// </summary>
    /// <param name="instance">Instance that data belongs to</param>
    /// <param name="dataId">Data id for the  data</param>
    /// <param name="data">The data to perform calculations on</param>
    public override async Task<bool> RunProcessDataRead(Instance instance, Guid? dataId, object data)
    {
      return await _dataProcessingHandler.ProcessDataRead(instance, dataId, data);
    }

    /// <summary>
    /// Is called to run custom calculation events defined by app developer when data is written to app
    /// </summary>
    /// <param name="instance">Instance that data belongs to</param>
    /// <param name="dataId">Data id for the  data</param>
    /// <param name="data">The data to perform calculations on</param>
    public override async Task<bool> RunProcessDataWrite(Instance instance, Guid? dataId, object data)
    {
      return await _dataProcessingHandler.ProcessDataWrite(instance, dataId, data);
    }

    /// <summary>
    /// Is called to run custom instantiation validation defined by app developer.
    /// </summary>
    /// <returns>Task with validation results</returns>
    public override async Task<InstantiationValidationResult> RunInstantiationValidation(Instance instance)
    {
      return await _instantiationHandler.RunInstantiationValidation(instance);
    }

    /// <summary>
    /// Is called to run data creation (custom prefill) defined by app developer.
    /// </summary>
    /// <param name="instance">The data to perform data creation on</param>
    /// <param name="data">The data object being created</param>
    /// <param name="prefill">External prefill available under instansiation</param>
    public override async Task RunDataCreation(Instance instance, object data, Dictionary<string, string> prefill)
    {
      await _instantiationHandler.DataCreation(instance, data, prefill);
    }  

    /// <summary>
    /// Hook to run code when process tasks is ended. 
    /// </summary>
    /// <param name="taskId">The current TaskId</param>
    /// <param name="instance">The instance where task is ended</param>
    /// <returns></returns>
    public override async Task RunProcessTaskEnd(string taskId, Instance instance)
    {
      return;
    }    

    public override async Task<List<string>> GetPageOrder(string org, string app, int instanceOwnerId, Guid instanceGuid, string layoutSetId, string currentPage, string dataTypeId, object formData)
    {
      List<string> pageOrder = new List<string>();

      if (string.IsNullOrEmpty(layoutSetId))
      {
        pageOrder = _appResources.GetLayoutSettings().Pages.Order;
      }
      else
      {
        pageOrder = _appResources.GetLayoutSettingsForSet(layoutSetId).Pages.Order;
      }
      if (formData.GetType() == typeof(NestedGroup))
      {
        UpdatePageOrder(pageOrder, (NestedGroup)formData);
      }
      return pageOrder;
    }

    private void UpdatePageOrder(List<string> pageOrder, NestedGroup formdata)
    {
      var newValue = formdata?.Endringsmeldinggrp9786?.OversiktOverEndringenegrp9788?.FirstOrDefault()?.SkattemeldingEndringEtterFristNyttBelopdatadef37132?.value; 
      if (newValue.HasValue && newValue > 10)
      {
        pageOrder.Remove("hide");
      }
    }
  }
}

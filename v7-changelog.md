1. Added [packages diagram](packages.drawio.svg) to visualize new package structure
2. Merged `Altinn.App.Common` and `Altinn.App.PlatformServices` into `Altinn.App.Core`
   - Kept namespacesd and folder structure
   - Consolidated all Nuget packages
   - Removed support for .Net5.0
3. Moved and grouped http clients into new namespaces
   - From Implementation folder to Altinn.App.Core.Infrastructure.Clients.[Area] where area is Register, Storage
   - Not named HttpClients since clients might be other than http.
4. Replaced virtual/abstract methods in AppBase with Dependency Injection to implement custom code.
   - GetAppModelType() and CreateNewAppModel() is replaced by new class in the App that implements IAppModel (This file should be the only dotnet code needed by default for an app)
   - Overriding ProcessDataWrite/Read is now done by injecting a class implementing IDataProcessor. `App/logic/DataProcessing/DataProcessingHandler.cs` in app-template is no longer needed
   - Overriding RunInstantiationValidation and DataCreation is now done by injecting a class implementing IInstantiation. `App/logic/InstantiationHandler.cs` in app-template is no longer needed.
   - Overriding validation logic is done by injecting a class implementing IInstanceValidation. `App/logic/Validation/ValidationHandler.cs` in app-template is no longer needed.
   - ICustomPdfGenerator renamed to IPdfFormatter, ICustomPdfGenerator was already implemented with DI, `App/logic/Print/PdfHandler.cs` in app-template is no longer needed.
   - Deprecated method `IAltinnApp.GetPageOrder()` is removed. It's now only possible to override this logic by injecting a class implementing IPageOrder
   - Overriding logic for RunProcessTaskEnd is done by injecting a class implementing ITaskProcessor.  
5. Created AddAltinnAppServices in Api project as the new main method to call from Program.cs in the app
6. Moved code
   - Moved registration of Application Insights from Core to Api project.
   - Moved Filters to Infrastructure namespace in Api project
   - Moved SecurityHeaders middleware to Infrastructure namespace in Api project
   - Moved various helper classes into Helpers namespace in both Api and Core
   - Deleted all classes under the ModelMetadata folder as these are not used
7. Replace all public Task On****() methods in AppBase in separate interfaces for Task and App events.
8. Move EFormidling logic out of AppBase. Not a separate nuget yet, but moved to a separate namespace
   - SendEFormidlingShipment(Instance instance) method and all related private methods moved to DefaultEFormidlingService.
   - GenerateEFormidlingMetadata(Instance instance) methods is removed and should be implemented by providing a class implementing IEFormidlingMetadata.
   - To make injecting EFormidling services easier a new method is added to Extensions.ServiceCollectionExtensions.
      - AddEFormidlingServices<T>(IConfiguration configuration) where T is the class implementing IEFormidlingMetadata in the serviceowners project. Eg: services.AddEFormidlingServices<Altinn.App.ServiceOwners.MyEFormidlingMetadata>(config). This will register all necessary services.
   - GetEFormidlingReceivers() is overridden by implementing IEFormidlingReceivers and supplied as the second Generic to AddEFromidlingServices, default implementation is used if not supplied. This is used to get the list of services that should receive the EFormidlingShipment.
   - TODO: Test if this logic can be written as a new Event receiver making it easier to extend an application with EFormidling just by including the EFormidling nuget
9. A side effect of 4. 5. and 6. the only methods left in IAltinnApp/AppBase was calls to other services.
   - Replaced calls in the code with direct calls to these services and removed them from AppBase.
   - Removed CanEndProcessTask(....) from AppBase and replaced it with a static method in Helpers.ProcessHelpers (the checks only use the input arguments to the method)
   - No methods are left in IAltinnApp/AppBase. Removed the interface and implementation.

DRAFT: Upgrade documentation

This documentation assumes you are on version 6 of the application template.

## 1. Update Nuget pacakges
1. Add latest version of Altinn.App.Core. This is a new pacakge and contains what previously used to be in Altinn.App.Common and Altinn.App.PlatformServices.
2. Remove the Altinn.App.Common package.
3. Remove the Altinn.App.PlatformServices package.
4. Update Altinn.App.Api to the latest version.

## 2. Update application class

All changes below are done in the `logic/App.cs` file in your app. This is a "big one", sorry about that but the intentions are good:) After doing these steps you will see that there is a pattern to how the changes are done and how customizing and Altinn App will be done moving forward.

### 1. Change Class definition

In the file `logic/App.cs` find the class definition:

   ```csharp
   public class App : AppBase, IAltinnApp
   ```

and replace this with:

   ```csharp
   public class App : IAppModel
   ```

You need to add the following using statement `using Altinn.App.Core.Interface;` to use the new interface.

### 2. Implement the `Create` method in the `IAppModel` interface

Find the CreateNewAppModel method:

   ```csharp
   public override object CreateNewAppModel(string classRef)
   ```

and replace this with:

   ```csharp
   public object Create(string classRef)
   ```

leave the body of the method as is.

### 3. Implement the `GetModelType` method in the `IAppModel` interface

Find the GetAppModelType method:

   ```csharp
   public override Type GetAppModelType(string classRef)
   ```

and replace this with:

   ```csharp      
   public Type GetModelType(string classRef)
   ```

leave the body of the method as is.

### 4. Replace RunProcessDataRead and RunProcessDataWrite

Find the `RunProcessDataRead` and `RunProcessDataWrite` methods. They should look something like this:

   ```csharp
   public override async Task<bool> RunProcessDataRead(Instance instance, Guid? dataId, object data)
   {
      return await _dataProcessingHandler.ProcessDataRead(instance, dataId, data);
   }

   public override async Task<bool> RunProcessDataWrite(Instance instance, Guid? dataId, object data)
   {
      return await _dataProcessingHandler.ProcessDataWrite(instance, dataId, data);
   }
   ```

If your method body looks different in either methods you probably have added some custom code to it. But normally you should have added custom code to the `DataProcessingHandler.cs` class, so check this file. If you don't have custom code the two corresponding methods normally looks like this:

   ```csharp
      public async Task<bool> ProcessDataRead(Instance instance, Guid? dataId, object data)
      {
         return await Task.FromResult(false);
      }

      public async Task<bool> ProcessDataWrite(Instance instance, Guid? dataId, object data)
      {
         return await Task.FromResult(false);
      }
   ```

**If you do have custom code**

For customizing these two methods moving forward, you now need to implement the `IDataProcessor` interface. If you have custom code in `DataProcessingHandler.cs` you can choose to just keep this file and do a few minor changes.

1. Add the `IDataProcssor` interface to the class definition

   ```csharp
   public class DataProcessingHandler : IDataProcessor
   ```

2. Add a using statement `using Altinn.App.Core.Interface;`

3. Register you implementation in `Program.cs` by adding

   ```csharp
   services.AddTransient<IDataProcessor, DataProcessingHandler>();
   ```

   This ensures your implementation is known to the application and will be executed as before.

If you would like to name and/or place your class differently you can do that as long as it implements the interface and is registred in the `Program.cs` class.

**After keeping your custom code or if you DON'T have custom code at all**
1. Delete both methods `RunProcessDataRead` and `RunProcessDataWrite` from `App.cs`.
2. Delete the file `logic/DataProcessing/DataProcessingHandler.cs`

### 5. Replace RunDataValidation and RunTaskValidation

Find the `RunDataValidation` and `RunTaskValidation` methods. They should look something like this:

   ```csharp
      public override async Task RunDataValidation(object data, ModelStateDictionary validationResults)
      {
         await _validationHandler.ValidateData(data, validationResults);
      }

      public override async Task RunTaskValidation(Instance instance, string taskId, ModelStateDictionary validationResults)
      {
         await _validationHandler.ValidateTask(instance, taskId, validationResults);
      }
      ```

   If your method body looks different in either methods you probably have added some custom code to it. But normally you should have added custom code to the `ValidationHandler` class, so check this file. If you don't have custom code the two corresponding methods normally looks like this:

   ```csharp
      public async Task ValidateData(object data, ModelStateDictionary validationResults)
      {
         await Task.CompletedTask;
      }

      public async Task ValidateTask(Instance instance, string taskId, ModelStateDictionary validationResults)
      {
         await Task.CompletedTask;
      }
   ```

**If you do have custom code**

For customizing these two methods moving forward, you now need to implement the `IInstanceValidator` interface. If you have custom code in `ValidationHandler.cs` you can choose to just keep this file and do a few minor changes.

1. Add the `IInstanceValidator` interface to the class definition

   ```csharp
   public class ValidationHandler : IInstanceValidator
   ```

2. Add a using statement `using Altinn.App.Core.Interface;`

3. Register you implementation in `Program.cs` by adding

   ```csharp
   services.AddTransient<IInstanceValidator, ValidationHandler>();
   ```

   This ensures your implementation is known to the application and will be executed as before.

If you would like to name and/or place your class differently you can do that as long as it implements the interface and is registred in the `Program.cs` class.

**After keeping your custom code or if you DON'T have custom code at all**
1. Delete both methods `RunDataValidation` and `RunTaskValidation` from `App.cs`.
2. Delete the file `logic/Validation/ValidationHandler.cs`

### 6. Replace RunInstantiationValidation and RunDataCreation

Find the `RunInstantiationValidation` and `RunDataCreation` methods. They should look something like this:

   ```csharp
      public override async Task<InstantiationValidationResult> RunInstantiationValidation(Instance instance)
      {
         return await _instantiationHandler.RunInstantiationValidation(instance);
      }

      public override async Task RunDataCreation(Instance instance, object data, Dictionary<string, string> prefill)
      {
         await _instantiationHandler.DataCreation(instance, data, prefill);
      }
   ```

If your method body looks different in either methods you probably have added some custom code to it. But normally you should have added custom code to the `InstantiationHandler` class, so check this file. If you don't have custom code the two corresponding methods normally looks like this:

   ```csharp
      public async Task<InstantiationValidationResult> RunInstantiationValidation(Instance instance)
      {
         return await Task.FromResult((InstantiationValidationResult)null);
      }

      public async Task DataCreation(Instance instance, object data, Dictionary<string, string> prefill)
      {
         await Task.CompletedTask;
      }
   ```

**If you do have custom code**

For customizing these two methods moving forward, you now need to implement the `IInstantiation` interface. If you have custom code in `ValidationHandler.cs` you can choose to just keep this file and do a few minor changes.

1. Add the `IInstantiation` interface to the class definition

   ```csharp
   public class InstantiationHandler: IInstantiation
   ```

2. Add a using statement `using Altinn.App.Core.Interface;`

3. Rename the method `RunInstantiationValidation` to `Validation`
4. Register you implementation in `Program.cs` by adding

   ```csharp
   services.AddTransient<IInstantiation, InstantiationHandler>();
   ```

   This ensures your implementation is known to the application and will be executed as before.

If you would like to name and/or place your class differently you can do that as long as it implements the interface and is registred in the `Program.cs` class.

**After keeping your custom code or if you DON'T have custom code at all**
1. Delete both methods `RunInstantiationValidation` and `RunDataCreation` from `App.cs`.
2. Delete the file `logic/InstantiationHandler.cs`

### 7. Replace RunProcessTaskEnd

Find the `RunProcessTaskEnd`. Without custom code it should look something like this:

   ```csharp
        public override async Task RunProcessTaskEnd(string taskId, Instance instance)
        {
            await Task.CompletedTask;
        }
   ```

If your method body looks different you probably have added some custom code to it.

**If you do have custom code**

For customizing this moving forward, you now need to implement the `ITaskProcessor` interface.

1. Create a new class implementing the `ITaskProcessor` interface, choose a name and file location that makes sence to your application. An example of an empty implementation would look like this:

   ```csharp
   public class CustomTaskProcessor : ITaskProcessor
   {
      public Task ProcessTaskEnd(string taskId, Instance instance)
      {
            throw new System.NotImplementedException();
      }
   }
   ```

2. Add a using statement `using Altinn.App.Core.Interface;`

3. Copy the code from the `RunProcessTaskEnd` method into the `ProcessTaskEnd` method in your new class.

4. Register you implementation in `Program.cs` by adding

   ```csharp
   services.AddTransient<ITaskProcessor, CustomTaskProcessor>();
   ```

**After keeping your custom code or if you DON'T have custom code at all**
1. Delete the method `RunProcessTaskEnd` from `App.cs`.

### 8. Clean up constructor
1. Remove the base call from the constructor

   Since we're not longer inheriting from AppBase we need to remove the call to the base constructor. Find the constructor, it should look something like this:

2. Remove the services no longer needed from the constructor

   This should include IPrefill, IInstance, IPdfService, IData, IAppResources

3. Remove the instanciated services in the constructor body and private variables

   This should include ValidationHandler, DataProcessingHandler, InstansiationHandler

In the end the constructor should look something like this:

   ```csharp
   public App(ILogger<App> logger)
   {
      _logger = logger;
   }
   ```

### 9. Clean up unused using statements
Your IDE should give you some help with doing this automatically, but in the end it should look something like this:

   ```csharp
   using System;
   using Altinn.App.Core.Interface;
   using Microsoft.Extensions.Logging;
   ```

## 3. Update Program.cs file

1. Replace main method of adding Altinn services

   Locate the following two lines:

   ```csharp
   services.AddAppServices(config, builder.Environment);
   services.AddPlatformServices(config, builder.Environment);
   ```

   and repleace them with this:

   ```csharp
   services.AddAltinnAppServices(config, builder.Environment);
   ```
   This will require the following using statement to be added:

   ```csharp
   using Altinn.App.Api.Extensions;
   ```

2. Change App registration

   Locate the following line:

   ```csharp
   services.AddTransient<IAltinnApp, Altinn.App.AppLogic.App>();
   ```

   and replace it with this:

   ```csharp
   services.AddTransient<IAppModel, Altinn.App.AppLogic.App>();
   ```

   This will reqire the following using statement to be added:

   ```csharp
   using Altinn.App.Core.Interface;
   ```

3. Remove old and not used using statements

   A few files have shifted namespace. The tooling should help you out, but the following should be removed:

   ```csharp
   using Altinn.App.Api.Filters;
   using Altinn.App.Api.Middleware;

   using Altinn.App.Services.Interface;

   using Microsoft.ApplicationInsights;
   using Microsoft.ApplicationInsights.Extensibility;
   ```

   The following should be added:
   ```csharp
   using Altinn.App.Api.Infrastructure.Filters;
   ```

4. Update using statements
   As a lot of classes within the nuget packages have moved the using statements needs to reflect this if you have used our classes in your custom code.
   Most of the code has moved from `Altinn.App.Common` and `Altinn.App.PlatformServices` and into `Altinn.App.Core` so if you have used classes from those namespaces you will most likely find them in `Altinn.App.Core`. A few classes have moved to `Altinn.App.Api` as well, so check there if you can't find them in `Altinn.App.Core`. 

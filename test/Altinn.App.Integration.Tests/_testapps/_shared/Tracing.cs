using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Altinn.App.Core.EFormidling.Interface;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Action;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Features.ExternalApi;
using Altinn.App.Core.Features.FileAnalysis;
using Altinn.App.Core.Features.Options;
using Altinn.App.Core.Features.Validation;
using Altinn.App.Core.Internal.Events;
using Altinn.App.Core.Internal.Process.Authorization;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.UserAction;
using Altinn.App.Core.Models.Validation;
using Altinn.Common.EFormidlingClient.Models.SBD;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.Extensions.DependencyInjection;

#nullable enable

namespace TestApp.Shared;

public static class TracingDI
{
    public static IServiceCollection AddTracingServices(this IServiceCollection services)
    {
        // These services simply log their execution to the snapshot logger so
        // that we can trace the execution flow in the snapshots (what executes and when/in what order).
        // This makes refactoring internals and keeping track of behavior easier/possible.

        // Logs requests and user information
        services.Configure<MvcOptions>(options => options.Filters.Add<TracingActionFilter>());

        // App implementable services from Altinn.App.Core
        services.AddSingleton<IAppOptionsProvider, AppOptionsProvider>();
        services.AddSingleton<IDataElementValidator, DataElementValidator>();
        services.AddSingleton<IDataListProvider, DataListProvider>();
        services.AddSingleton<IDataProcessor, DataProcessor>();
        services.AddSingleton<IDataWriteProcessor, DataWriteProcessor>();
        services.AddSingleton<IEventHandler, EventHandler>();
        services.AddSingleton<IFormDataValidator, FormDataValidator>();
        services.AddSingleton<IInstanceAppOptionsProvider, InstanceAppOptionsProvider>();
        services.AddSingleton<IInstanceDataListProvider, InstanceDataListProvider>();
        services.AddSingleton<IInstantiationProcessor, InstantiationProcessor>();
        services.AddSingleton<IInstantiationValidator, InstantiationValidator>();
        services.AddSingleton<IProcessEnd, ProcessEnd>();
        services.AddSingleton<IProcessTaskAbandon, ProcessTaskAbandon>();
        services.AddSingleton<IProcessTaskEnd, ProcessTaskEnd>();
        services.AddSingleton<IProcessTaskStart, ProcessTaskStart>();
        services.AddSingleton<ITaskValidator, TaskValidator>();
        services.AddSingleton<IUserAction, UserAction>();
        services.AddSingleton<IUserActionAuthorizer, UserActionAuthorizer>();
        services.AddSingleton<IValidateQueryParamPrefill, ValidateQueryParamPrefill>();
        services.AddSingleton<IValidator, Validator>();
        services.AddSingleton<IExternalApiClient, ExternalApiClient>();
        services.AddSingleton<IFileAnalyser, FileAnalyser>();
        services.AddSingleton<IAppOptionsFileHandler, AppOptionsFileHandler>();
        services.AddSingleton<IFileValidator, FileValidator>();
        services.AddSingleton<IEFormidlingMetadata, EFormidlingMetadata>();
        services.AddSingleton<IEFormidlingReceivers, EFormidlingReceivers>();
        services.AddSingleton<IEventSecretCodeProvider, EventSecretCodeProvider>();
        services.AddSingleton<IUserActionAuthorizerProvider, UserActionAuthorizerProvider>();
        return services;
    }
}

public sealed class TracingActionFilter : IActionFilter
{
    public void OnActionExecuting(ActionExecutingContext context)
    {
        var userAgent = context.HttpContext.Request.Headers["User-Agent"].ToString();
        if (userAgent != "Altinn.App.Integration.Tests")
            return;
        string userInfo = "";
        try
        {
            var authenticationContext =
                context.HttpContext.RequestServices.GetRequiredService<IAuthenticationContext>();
            var auth = authenticationContext.Current;
            var (identifier, authLevel, authMethod) = auth switch
            {
                Authenticated.None => ("none", 0, "none"),
                Authenticated.User u => (
                    $"{u.UserId}/{u.UserPartyId}{(!string.IsNullOrWhiteSpace(u.Username) ? $"/{u.Username}" : "")}",
                    u.AuthenticationLevel,
                    u.AuthenticationMethod
                ),
                Authenticated.Org o => ($"{o.OrgNo}", o.AuthenticationLevel, o.AuthenticationMethod),
                Authenticated.ServiceOwner so => ($"{so.OrgNo}", so.AuthenticationLevel, so.AuthenticationMethod),
                Authenticated.SystemUser su => (
                    $"{su.SystemUserOrgNr}/{su.SystemUserId}",
                    su.AuthenticationLevel,
                    su.AuthenticationMethod
                ),
                _ => ("unknown", 0, "unknown"),
            };
            userInfo = $"User: {auth?.GetType().Name}/{identifier}, AuthLevel: {authLevel}, AuthMethod: {authMethod}";
        }
        catch (Exception ex)
        {
            SnapshotLogger.LogError($"### Error processing user information in request: {ex}");
        }
        var action = (ControllerActionDescriptor)context.ActionDescriptor;
        SnapshotLogger.LogInfo($"### Request: {action.ControllerName}.{action.ActionName} - " + userInfo);
    }

    public void OnActionExecuted(ActionExecutedContext context)
    {
        var userAgent = context.HttpContext.Request.Headers["User-Agent"].ToString();
        if (userAgent != "Altinn.App.Integration.Tests")
            return;
        var action = (ControllerActionDescriptor)context.ActionDescriptor;
        var result = context.Result;
        var statusCode = (result as IStatusCodeActionResult)?.StatusCode;
        SnapshotLogger.LogInfo(
            $"### Response: {action.ControllerName}.{action.ActionName} - {result?.GetType().Name}, StatusCode: {statusCode}"
        );
    }
}

internal sealed class AppOptionsProvider : IAppOptionsProvider
{
    public string Id => "tracing-app-options";

    public Task<AppOptions> GetAppOptionsAsync(string? language, Dictionary<string, string> keyValuePairs)
    {
        SnapshotLogger.LogInfo("IAppOptionsProvider.GetAppOptionsAsync");
        return Task.FromResult(new AppOptions());
    }
}

internal sealed class DataElementValidator : IDataElementValidator
{
    public string DataType => "*";

    public Task<List<ValidationIssue>> ValidateDataElement(
        Instance instance,
        DataElement dataElement,
        Altinn.Platform.Storage.Interface.Models.DataType dataType,
        string? language
    )
    {
        SnapshotLogger.LogInfo("IDataElementValidator.ValidateDataElement");
        return Task.FromResult(new List<ValidationIssue>());
    }
}

internal sealed class DataListProvider : IDataListProvider
{
    public string Id => "tracing-data-list";

    public Task<DataList> GetDataListAsync(string? language, Dictionary<string, string> keyValuePairs)
    {
        SnapshotLogger.LogInfo("IDataListProvider.GetDataListAsync");
        return Task.FromResult(new DataList());
    }
}

internal sealed class DataProcessor : IDataProcessor
{
    public Task ProcessDataRead(Instance instance, Guid? dataId, object data, string? language)
    {
        SnapshotLogger.LogInfo("IDataProcessor.ProcessDataRead");
        return Task.CompletedTask;
    }

    public Task ProcessDataWrite(Instance instance, Guid? dataId, object data, object? previousData, string? language)
    {
        SnapshotLogger.LogInfo("IDataProcessor.ProcessDataWrite");
        return Task.CompletedTask;
    }
}

internal sealed class DataWriteProcessor : IDataWriteProcessor
{
    public Task ProcessDataWrite(
        IInstanceDataMutator instanceDataMutator,
        string taskId,
        DataElementChanges changes,
        string? language
    )
    {
        SnapshotLogger.LogInfo("IDataWriteProcessor.ProcessDataWrite");
        return Task.CompletedTask;
    }
}

internal sealed class EventHandler : IEventHandler
{
    public string EventType => "tracing-event";

    public Task<bool> ProcessEvent(CloudEvent cloudEvent)
    {
        SnapshotLogger.LogInfo("IEventHandler.ProcessEvent");
        return Task.FromResult(false);
    }
}

internal sealed class FormDataValidator : IFormDataValidator
{
    public string DataType => "*";

    public bool HasRelevantChanges(object current, object previous)
    {
        SnapshotLogger.LogInfo("IFormDataValidator.HasRelevantChanges");
        return true;
    }

    public Task<List<ValidationIssue>> ValidateFormData(
        Instance instance,
        DataElement dataElement,
        object data,
        string? language
    )
    {
        SnapshotLogger.LogInfo("IFormDataValidator.ValidateFormData");
        return Task.FromResult(new List<ValidationIssue>());
    }
}

internal sealed class InstanceAppOptionsProvider : IInstanceAppOptionsProvider
{
    public string Id => "tracing-instance-app-options";

    public Task<AppOptions> GetInstanceAppOptionsAsync(
        InstanceIdentifier instanceIdentifier,
        string? language,
        Dictionary<string, string> keyValuePairs
    )
    {
        SnapshotLogger.LogInfo("IInstanceAppOptionsProvider.GetInstanceAppOptionsAsync");
        return Task.FromResult(new AppOptions());
    }
}

internal sealed class InstanceDataListProvider : IInstanceDataListProvider
{
    public string Id => "tracing-instance-data-list";

    public Task<DataList> GetInstanceDataListAsync(
        InstanceIdentifier instanceIdentifier,
        string? language,
        Dictionary<string, string> keyValuePairs
    )
    {
        SnapshotLogger.LogInfo("IInstanceDataListProvider.GetInstanceDataListAsync");
        return Task.FromResult(new DataList());
    }
}

internal sealed class InstantiationProcessor : IInstantiationProcessor
{
    public Task DataCreation(Instance instance, object data, Dictionary<string, string>? prefill)
    {
        SnapshotLogger.LogInfo("IInstantiationProcessor.DataCreation");
        return Task.CompletedTask;
    }
}

internal sealed class InstantiationValidator : IInstantiationValidator
{
    public Task<InstantiationValidationResult?> Validate(Instance instance)
    {
        SnapshotLogger.LogInfo("IInstantiationValidator.Validate");
        return Task.FromResult<InstantiationValidationResult?>(null);
    }
}

internal sealed class ProcessEnd : IProcessEnd
{
    public Task End(Instance instance, List<InstanceEvent>? events)
    {
        SnapshotLogger.LogInfo("IProcessEnd.End");
        return Task.CompletedTask;
    }
}

internal sealed class ProcessTaskAbandon : IProcessTaskAbandon
{
    public Task Abandon(string taskId, Instance instance)
    {
        SnapshotLogger.LogInfo("IProcessTaskAbandon.Abandon");
        return Task.CompletedTask;
    }
}

internal sealed class ProcessTaskEnd : IProcessTaskEnd
{
    public Task End(string taskId, Instance instance)
    {
        SnapshotLogger.LogInfo("IProcessTaskEnd.End");
        return Task.CompletedTask;
    }
}

internal sealed class ProcessTaskStart : IProcessTaskStart
{
    public Task Start(string taskId, Instance instance, Dictionary<string, string>? prefill)
    {
        SnapshotLogger.LogInfo("IProcessTaskStart.Start");
        return Task.CompletedTask;
    }
}

internal sealed class TaskValidator : ITaskValidator
{
    public string TaskId => "Task_1";

    public Task<List<ValidationIssue>> ValidateTask(Instance instance, string taskId, string? language)
    {
        SnapshotLogger.LogInfo("ITaskValidator.ValidateTask");
        return Task.FromResult(new List<ValidationIssue>());
    }
}

internal sealed class UserAction : IUserAction
{
    public string Id => "tracing-user-action";

    public Task<UserActionResult> HandleAction(UserActionContext context)
    {
        SnapshotLogger.LogInfo("IUserAction.HandleAction");
        return Task.FromResult(UserActionResult.SuccessResult());
    }
}

internal sealed class UserActionAuthorizer : IUserActionAuthorizer
{
    public Task<bool> AuthorizeAction(UserActionAuthorizerContext context)
    {
        SnapshotLogger.LogInfo("IUserActionAuthorizer.AuthorizeAction");
        return Task.FromResult(true);
    }
}

internal sealed class ValidateQueryParamPrefill : IValidateQueryParamPrefill
{
    public Task<ValidationIssue?> PrefillFromQueryParamsIsValid(Dictionary<string, string> prefill)
    {
        SnapshotLogger.LogInfo("IValidateQueryParamPrefill.PrefillFromQueryParamsIsValid");
        return Task.FromResult<ValidationIssue?>(null);
    }
}

internal sealed class Validator : IValidator
{
    public string TaskId => "Task_1";

    public Task<List<ValidationIssue>> Validate(IInstanceDataAccessor dataAccessor, string taskId, string? language)
    {
        SnapshotLogger.LogInfo("IValidator.Validate");
        return Task.FromResult(new List<ValidationIssue>());
    }

    public Task<bool> HasRelevantChanges(IInstanceDataAccessor dataAccessor, string taskId, DataElementChanges changes)
    {
        SnapshotLogger.LogInfo("IValidator.HasRelevantChanges");
        return Task.FromResult(true);
    }
}

internal sealed class ExternalApiClient : IExternalApiClient
{
    public string Id => "tracing-external-api";

    public Task<object?> GetExternalApiDataAsync(
        InstanceIdentifier instanceIdentifier,
        Dictionary<string, string> queryParams
    )
    {
        SnapshotLogger.LogInfo("IExternalApiClient.GetExternalApiDataAsync");
        return Task.FromResult<object?>(new object());
    }
}

internal sealed class FileAnalyser : IFileAnalyser
{
    public string Id => "tracing-file-analyser";

    public Task<FileAnalysisResult> Analyse(Stream stream, string? filename = null)
    {
        SnapshotLogger.LogInfo("IFileAnalyser.Analyse");
        return Task.FromResult(new FileAnalysisResult(Id));
    }
}

internal sealed class AppOptionsFileHandler : IAppOptionsFileHandler
{
    public Task<List<AppOption>?> ReadOptionsFromFileAsync(string optionId)
    {
        SnapshotLogger.LogInfo("IAppOptionsFileHandler.ReadOptionsFromFileAsync");
        return Task.FromResult<List<AppOption>?>([]);
    }
}

internal sealed class FileValidator : IFileValidator
{
    public string Id => "tracing-file-validator";

    public Task<(bool Success, IEnumerable<ValidationIssue> Errors)> Validate(
        DataType dataType,
        IEnumerable<FileAnalysisResult> fileAnalysisResults
    )
    {
        SnapshotLogger.LogInfo("IFileValidator.Validate");
        return Task.FromResult((true, Enumerable.Empty<ValidationIssue>()));
    }
}

internal sealed class EFormidlingMetadata : IEFormidlingMetadata
{
    public Task<(string MetadataFilename, Stream Metadata)> GenerateEFormidlingMetadata(Instance instance)
    {
        SnapshotLogger.LogInfo("IEFormidlingMetadata.GenerateEFormidlingMetadata");
        return Task.FromResult(("metadata.xml", (Stream)new MemoryStream()));
    }
}

internal sealed class EFormidlingReceivers : IEFormidlingReceivers
{
    public Task<List<Receiver>> GetEFormidlingReceivers(Instance instance)
    {
        SnapshotLogger.LogInfo("IEFormidlingReceivers.GetEFormidlingReceivers");
        return Task.FromResult(new List<Receiver>());
    }
}

internal sealed class EventSecretCodeProvider : IEventSecretCodeProvider
{
    public Task<string> GetSecretCode()
    {
        SnapshotLogger.LogInfo("IEventSecretCodeProvider.GetSecretCode");
        return Task.FromResult("secret-code");
    }
}

internal sealed class UserActionAuthorizerProvider : IUserActionAuthorizerProvider
{
    public string? Action => "tracing-user-action";
    public string? TaskId => "Task_1";
    public IUserActionAuthorizer Authorizer => new UserActionAuthorizer();
}

using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Instances;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using TestApp.Shared;

namespace Altinn.App.Integration.Tests.Scenarios.WorkflowEngineFailure;

public sealed class FailingServiceTask : IServiceTask
{
    public string Type => "failing-service";

    public void DefineExecute(PipelineBuilder.ServiceTask pipeline) => pipeline.Stage(Execute);

    public Task<ServiceTaskResult> Execute(StageContext context)
    {
        if (WorkflowEngineFailureState.FailServiceTask)
        {
            return Task.FromResult<ServiceTaskResult>(
                ServiceTaskResult.FailedPermanent("Scenario service task failed permanently.")
            );
        }

        return Task.FromResult(ServiceTaskResult.Completed());
    }
}

public sealed class WorkflowEngineFailureEndpoints : IEndpointConfigurator
{
    public void ConfigureEndpoints(WebApplication app)
    {
        app.MapPost(
            "/test/workflow-engine-failure/reset",
            () =>
            {
                WorkflowEngineFailureState.Reset();
                return Results.Ok();
            }
        );

        // Moves the instance into Task_Service the way v8 committed a transition into a service task whose run then
        // failed: one process write with its events, and no process status, which v8 did not know.
        app.MapPost(
            "/test/workflow-engine-failure/park-in-service-task-as-v8/{instanceOwnerPartyId:int}/{instanceGuid:guid}",
            async (int instanceOwnerPartyId, Guid instanceGuid, IAppMetadata appMetadata, IInstanceClient instances) =>
            {
                string[] appId = (await appMetadata.GetApplicationMetadata()).Id.Split('/');
                Instance instance = await instances.GetInstance(
                    appId[1],
                    appId[0],
                    instanceOwnerPartyId,
                    instanceGuid,
                    StorageAuthenticationMethod.ServiceOwner()
                );
                ProcessState left = instance.Process;
                var entered = new ProcessState
                {
                    Started = left.Started,
                    StartEvent = left.StartEvent,
                    CurrentTask = new ProcessElementInfo
                    {
                        Flow = left.CurrentTask.Flow + 1,
                        Started = DateTime.UtcNow,
                        ElementId = "Task_Service",
                        Name = "Feilende service task",
                        AltinnTaskType = "failing-service",
                        FlowType = "CompleteCurrentMoveToNext",
                    },
                };
                instance.Process = entered;
                List<InstanceEvent> events =
                [
                    CreateEvent(instance, InstanceEventType.process_EndTask, left),
                    CreateEvent(instance, InstanceEventType.process_StartTask, entered),
                ];
                await instances.UpdateProcessAndEvents(instance, events, StorageAuthenticationMethod.ServiceOwner());
                return Results.Ok();
            }
        );

        app.MapPost(
            "/test/workflow-engine-failure/allow-service-task",
            () =>
            {
                WorkflowEngineFailureState.SetFailServiceTask(false);
                return Results.Ok();
            }
        );
    }

    private static InstanceEvent CreateEvent(Instance instance, InstanceEventType eventType, ProcessState process) =>
        new()
        {
            InstanceId = instance.Id,
            InstanceOwnerPartyId = instance.InstanceOwner.PartyId,
            EventType = eventType.ToString(),
            Created = DateTime.UtcNow,
            User = new PlatformUser { OrgId = "ttd" },
            ProcessInfo = process,
        };
}

internal static class WorkflowEngineFailureState
{
    private static readonly object _lock = new();
    private static bool _failServiceTask = true;

    public static bool FailServiceTask
    {
        get
        {
            lock (_lock)
            {
                return _failServiceTask;
            }
        }
    }

    public static void SetFailServiceTask(bool fail)
    {
        lock (_lock)
        {
            _failServiceTask = fail;
        }
    }

    public static void Reset() => SetFailServiceTask(true);
}

public static class ServiceRegistration
{
    public static void RegisterServices(IServiceCollection services)
    {
        services.AddTransient<IServiceTask, FailingServiceTask>();
        services.AddSingleton<IEndpointConfigurator, WorkflowEngineFailureEndpoints>();
    }
}

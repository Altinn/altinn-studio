using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Events;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using TestApp.Shared;

namespace Altinn.App.Integration.Tests.Scenarios.WorkflowEngineSideEffects;

/// <summary>
/// Service task that completes without auto-advance, so the process stays on Task_Service until
/// the next manual process/next. Used to prove the next transition waits on ExecuteServiceTask
/// (critical, in the Main workflow) while the Altinn event registrations run non-blocking.
/// </summary>
public sealed class ManualServiceTask : IServiceTask
{
    public string Type => "write";

    public Task<ServiceTaskResult> Execute(ServiceTaskContext context)
    {
        SnapshotLogger.LogInfo("IServiceTask.Execute.SideEffectsScenario");
        return Task.FromResult<ServiceTaskResult>(ServiceTaskResult.SuccessWithoutAutoAdvance());
    }
}

/// <summary>
/// Replaces the platform Events client with one that records each registration and delays it long
/// enough that the side-effects workflow cannot possibly be finished when the ProcessNext response
/// arrives. If ProcessNext still returned quickly, the API demonstrably did not wait for the
/// side effects.
/// </summary>
public sealed class DelayingEventsClient : IEventsClient
{
    public static readonly TimeSpan Delay = TimeSpan.FromSeconds(10);

    public async Task<string> AddEvent(
        string eventType,
        Instance instance,
        StorageAuthenticationMethod? authenticationMethod = null
    )
    {
        await Task.Delay(Delay);
        SideEffectsState.RecordEvent(eventType);
        return Guid.NewGuid().ToString();
    }
}

internal static class SideEffectsState
{
    private static readonly object _lock = new();
    private static readonly List<string> _registeredEventTypes = new();

    public static void RecordEvent(string eventType)
    {
        lock (_lock)
        {
            _registeredEventTypes.Add(eventType);
        }
    }

    public static IReadOnlyList<string> GetRegisteredEventTypes()
    {
        lock (_lock)
        {
            return _registeredEventTypes.ToArray();
        }
    }
}

public sealed class SideEffectsEndpoints : IEndpointConfigurator
{
    public void ConfigureEndpoints(WebApplication app)
    {
        app.MapGet("/test/side-effects/events", () => Results.Json(SideEffectsState.GetRegisteredEventTypes()));
    }
}

public static class ServiceRegistration
{
    public static void RegisterServices(IServiceCollection services)
    {
        services.AddTransient<IServiceTask, ManualServiceTask>();
        // Last registration wins: replaces the real EventsClient (scenario services register
        // after AddAltinnAppServices).
        services.AddTransient<IEventsClient, DelayingEventsClient>();
        services.AddSingleton<IEndpointConfigurator, SideEffectsEndpoints>();
        // The basic app has events registration disabled - this scenario is specifically about
        // the Altinn event side effects, so enable it.
        services.PostConfigure<AppSettings>(settings => settings.RegisterEventsWithEventsComponent = true);
    }
}

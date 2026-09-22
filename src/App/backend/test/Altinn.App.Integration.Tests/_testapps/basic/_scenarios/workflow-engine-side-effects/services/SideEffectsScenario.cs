using System;
using System.Collections.Generic;
using System.Threading;
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
/// Service task that succeeds and advances to the end. Used to prove that ExecuteServiceTask
/// and its dependent transition finish while the Altinn event registrations run non-blocking.
/// </summary>
public sealed class SuccessfulServiceTask : IServiceTask
{
    public string Type => "write";

    public Task<ServiceTaskResult> Execute(ServiceTaskContext context)
    {
        SnapshotLogger.LogInfo("IServiceTask.Execute.SideEffectsScenario");
        return Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());
    }
}

/// <summary>
/// Holds event registrations until the test releases them, so the test can verify that process
/// transitions finish independently of their side effects.
/// </summary>
public sealed class ControlledEventsClient : IEventsClient
{
    public async Task<string> AddEvent(
        string eventType,
        Instance instance,
        StorageAuthenticationMethod? authenticationMethod = null,
        Guid? idempotencyKey = null,
        CancellationToken cancellationToken = default
    )
    {
        await SideEffectsState.WaitForRelease(cancellationToken);
        SideEffectsState.RecordEvent(eventType, idempotencyKey);
        return Guid.NewGuid().ToString();
    }
}

internal static class SideEffectsState
{
    private static readonly object _lock = new();
    private static readonly List<RegisteredEvent> _registeredEvents = new();
    private static readonly TaskCompletionSource _release = new(TaskCreationOptions.RunContinuationsAsynchronously);

    public static Task WaitForRelease(CancellationToken cancellationToken) =>
        _release.Task.WaitAsync(cancellationToken);

    public static void Release() => _release.TrySetResult();

    public static void RecordEvent(string eventType, Guid? idempotencyKey)
    {
        lock (_lock)
        {
            _registeredEvents.Add(new RegisteredEvent(eventType, idempotencyKey?.ToString()));
        }
    }

    public static IReadOnlyList<RegisteredEvent> GetRegisteredEvents()
    {
        lock (_lock)
        {
            return _registeredEvents.ToArray();
        }
    }
}

/// <summary>
/// One event registration as the client saw it. The key is what proves the engine's step identity
/// reached the outbound call, so the test can match it against the step the engine reports.
/// </summary>
internal sealed record RegisteredEvent(string EventType, string IdempotencyKey);

public sealed class SideEffectsEndpoints : IEndpointConfigurator
{
    public void ConfigureEndpoints(WebApplication app)
    {
        app.MapGet("/test/side-effects/events", () => Results.Json(SideEffectsState.GetRegisteredEvents()));
        app.MapPost(
            "/test/side-effects/release",
            () =>
            {
                SideEffectsState.Release();
                return Results.NoContent();
            }
        );
    }
}

public static class ServiceRegistration
{
    public static void RegisterServices(IServiceCollection services)
    {
        services.AddTransient<IServiceTask, SuccessfulServiceTask>();
        // Last registration wins: replaces the real EventsClient (scenario services register
        // after AddAltinnAppServices).
        services.AddTransient<IEventsClient, ControlledEventsClient>();
        services.AddSingleton<IEndpointConfigurator, SideEffectsEndpoints>();
        // The basic app has events registration disabled - this scenario is specifically about
        // the Altinn event side effects, so enable it.
        services.PostConfigure<AppSettings>(settings => settings.RegisterEventsWithEventsComponent = true);
    }
}

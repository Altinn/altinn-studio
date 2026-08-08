using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.App.Core.EFormidling.Interface;
using Altinn.App.Core.EFormidling.Models;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using TestApp.Shared;

namespace Altinn.App.Integration.Tests.Scenarios.EFormidlingPipeline;

/// <summary>
/// Stands in for the integrasjonspunkt, which nothing in this repo emulates. The send always
/// succeeds; the status reports the shipment as pending twice before confirming delivery, so the
/// framework's eFormidling service task really defers — and the engine really parks — twice before
/// the process advances.
/// </summary>
/// <remarks>
/// Only <see cref="IEFormidlingService"/> is replaced, not <c>IEFormidlingClient</c>: the SBD
/// construction, uploads and duplicate-create recovery below it are unit-tested, and faking at that
/// depth would add failure modes that have nothing to do with the property under test.
/// </remarks>
public sealed class ScriptedEFormidlingService : IEFormidlingService
{
    public Task SendEFormidlingShipment(
        IInstanceDataAccessor dataAccessor,
        ValidAltinnEFormidlingConfiguration configuration,
        CancellationToken cancellationToken = default
    )
    {
        int run = EFormidlingRunCounter.NextRun("Send");
        SnapshotLogger.LogInfo($"EFormidling.Send.Run{run}");
        return Task.CompletedTask;
    }

    public Task<EFormidlingShipmentStatus> GetEFormidlingShipmentStatus(
        IInstanceDataAccessor dataAccessor,
        ValidAltinnEFormidlingConfiguration configuration,
        CancellationToken cancellationToken = default
    )
    {
        int run = EFormidlingRunCounter.NextRun("Status");
        EFormidlingShipmentStatus status = run switch
        {
            1 => new() { State = EFormidlingDeliveryState.Pending, Status = "opprettet" },
            2 => new() { State = EFormidlingDeliveryState.Pending, Status = "sendt" },
            _ => new() { State = EFormidlingDeliveryState.Delivered, Status = "levert" },
        };

        SnapshotLogger.LogInfo($"EFormidling.Status.Run{run}.{status.State}.{status.Status}");
        return Task.FromResult(status);
    }
}

/// <summary>
/// Run counters keyed by call, surviving across callbacks (each callback resolves a fresh transient
/// service instance). Reset between tests via the scenario endpoint.
/// </summary>
internal static class EFormidlingRunCounter
{
    private static readonly object _lock = new();
    private static readonly Dictionary<string, int> _runs = new(StringComparer.Ordinal);

    public static int NextRun(string call)
    {
        lock (_lock)
        {
            int run = _runs.GetValueOrDefault(call) + 1;
            _runs[call] = run;
            return run;
        }
    }

    public static void Reset()
    {
        lock (_lock)
        {
            _runs.Clear();
        }
    }
}

public sealed class EFormidlingPipelineEndpoints : IEndpointConfigurator
{
    public void ConfigureEndpoints(WebApplication app)
    {
        app.MapPost(
            "/test/eformidling-pipeline/reset",
            () =>
            {
                EFormidlingRunCounter.Reset();
                return Results.Ok();
            }
        );
    }
}

public static class ServiceRegistration
{
    public static void RegisterServices(IServiceCollection services)
    {
        // The framework's EFormidlingServiceTask takes IEFormidlingService as an optional dependency,
        // so registering this alone is enough - the rest of AddEFormidling() (metadata, receivers,
        // the client itself) is only reachable through the real service.
        services.AddTransient<IEFormidlingService, ScriptedEFormidlingService>();
        services.AddSingleton<IEndpointConfigurator, EFormidlingPipelineEndpoints>();
    }
}

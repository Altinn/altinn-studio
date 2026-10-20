using System;
using System.Threading;
using System.Threading.Tasks;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.DependencyInjection;
using TestApp.Shared;

namespace Altinn.App.Integration.Tests.Scenarios.ProcessNextConcurrency;

public sealed class ControlledProcessTaskEnd : IProcessTask
{
    private static TaskCompletionSource _entered = CreateSignal();
    private static TaskCompletionSource _release = CreateSignal();
    private static int _taskEndInvocations;

    public string Type => AltinnTaskTypes.Data;

    public async Task End(ProcessTaskContext context)
    {
        Interlocked.Increment(ref _taskEndInvocations);
        _entered.TrySetResult();
        await _release.Task;
    }

    public static void Release()
    {
        _release.TrySetResult();
    }

    public static void Reset()
    {
        _release.TrySetResult();
        _entered = CreateSignal();
        _release = CreateSignal();
        Interlocked.Exchange(ref _taskEndInvocations, 0);
    }

    public static Task WaitUntilEntered(CancellationToken cancellationToken) =>
        _entered.Task.WaitAsync(cancellationToken);

    public static int TaskEndInvocations => Volatile.Read(ref _taskEndInvocations);

    private static TaskCompletionSource CreateSignal() => new(TaskCreationOptions.RunContinuationsAsynchronously);
}

public static class ControlledProcessAcquire
{
    private static TaskCompletionSource _entered = CreateSignal();
    private static TaskCompletionSource _release = CreateSignal();
    private static int _armed;

    public static void Arm()
    {
        Reset();
        Interlocked.Exchange(ref _armed, 1);
    }

    public static void Reset()
    {
        Interlocked.Exchange(ref _armed, 0);
        _release.TrySetResult();
        _entered = CreateSignal();
        _release = CreateSignal();
    }

    public static async Task BeforeAcquire(HttpContext context)
    {
        if (
            HttpMethods.IsPost(context.Request.Method)
            && context.Request.Path.Value?.EndsWith(
                "/workflow-engine-callbacks/AcquireProcessingStatus",
                StringComparison.Ordinal
            ) == true
            && Interlocked.Exchange(ref _armed, 0) == 1
        )
        {
            _entered.TrySetResult();
            await _release.Task.WaitAsync(context.RequestAborted);
        }
    }

    public static Task WaitUntilEntered(CancellationToken cancellationToken) =>
        _entered.Task.WaitAsync(cancellationToken);

    public static void Release() => _release.TrySetResult();

    private static TaskCompletionSource CreateSignal() => new(TaskCreationOptions.RunContinuationsAsynchronously);
}

public sealed class ControlledProcessAcquireFilter : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        await ControlledProcessAcquire.BeforeAcquire(context.HttpContext);
        await next();
    }
}

public sealed class ControlledProcessTaskEndEndpoints : IEndpointConfigurator
{
    public void ConfigureEndpoints(WebApplication app)
    {
        app.MapPost(
            "/test/process-next-concurrency/arm-acquire",
            () =>
            {
                ControlledProcessAcquire.Arm();
                return Results.Ok();
            }
        );
        app.MapPost(
            "/test/process-next-concurrency/wait-until-acquire",
            async (CancellationToken cancellationToken) =>
            {
                await ControlledProcessAcquire.WaitUntilEntered(cancellationToken);
                return Results.Ok();
            }
        );
        app.MapPost(
            "/test/process-next-concurrency/release-acquire",
            () =>
            {
                ControlledProcessAcquire.Release();
                return Results.Ok();
            }
        );
        app.MapPost(
            "/test/process-next-concurrency/release-task-end",
            () =>
            {
                ControlledProcessTaskEnd.Release();
                return Results.Ok();
            }
        );

        app.MapPost(
            "/test/process-next-concurrency/reset",
            () =>
            {
                ControlledProcessTaskEnd.Reset();
                ControlledProcessAcquire.Reset();
                return Results.Ok();
            }
        );

        app.MapPost(
            "/test/process-next-concurrency/wait-until-task-end",
            async (CancellationToken cancellationToken) =>
            {
                await ControlledProcessTaskEnd.WaitUntilEntered(cancellationToken);
                return Results.Ok();
            }
        );

        app.MapGet(
            "/test/process-next-concurrency/state",
            () => Results.Ok(new { taskEndInvocations = ControlledProcessTaskEnd.TaskEndInvocations })
        );
    }
}

public static class ServiceRegistration
{
    public static void RegisterServices(IServiceCollection services)
    {
        services.Configure<MvcOptions>(options => options.Filters.Add<ControlledProcessAcquireFilter>());
        services.AddTransient<IProcessTask, ControlledProcessTaskEnd>();
        services.AddSingleton<IEndpointConfigurator, ControlledProcessTaskEndEndpoints>();
    }
}

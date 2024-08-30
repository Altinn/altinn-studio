using System.Runtime.InteropServices.Marshalling;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Features.InterfaceFactory;

internal class InterfaceFactory
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly Telemetry _telemetry;

    private IServiceProvider _serviceProvider =>
        _httpContextAccessor.HttpContext?.RequestServices
        ?? throw new InvalidOperationException("RequestServices is null");

    public InterfaceFactory(IHttpContextAccessor httpContextAccessor, Telemetry telemetry)
    {
        _httpContextAccessor = httpContextAccessor;
        _telemetry = telemetry;
    }

    private T[] GetServices<T>()
        where T : notnull
    {
        var stopwatch = new System.Diagnostics.Stopwatch();
        stopwatch.Start();

        // call .ToArray to ensure that the services are fully
        // resolved before stopping the stopwatch.
        var services = _serviceProvider.GetServices<T>().ToArray();

        stopwatch.Stop();
        var elapsedMilliseconds = stopwatch.ElapsedMilliseconds;
        if (elapsedMilliseconds > 1)
        {
            var message = $"Resolved {services.Length} services of type {typeof(T).Name} in {elapsedMilliseconds} ms";
            var serviceNames = services.Select(s => s.GetType().Name).ToArray();
            //TODO: add telemetry span for this service initialization.
        }
        return services;
    }

    public IDataProcessor[] GetDataProcessors() => GetServices<IDataProcessor>();

    public IInstantiationProcessor[] GetInstantiationProcessors() => GetServices<IInstantiationProcessor>();

    public IProcessTaskInitializer[] GetProcessTaskInitializers() => GetServices<IProcessTaskInitializer>();
}

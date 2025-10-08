using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Features;

/// <summary>
/// Marker attribute for interfaces that are meant to be implemented by apps.
/// </summary>
[AttributeUsage(AttributeTargets.Interface, AllowMultiple = false)]
internal sealed class ImplementableByAppsAttribute : Attribute { }

internal static class AppImplementationFactoryExtensions
{
    public static IServiceCollection AddAppImplementationFactory(this IServiceCollection services)
    {
        services.AddSingleton<AppImplementationFactory>();
        return services;
    }
}

internal sealed class AppImplementationFactory
{
    private readonly IServiceProvider _rootServiceProvider;

    public AppImplementationFactory(IServiceProvider sp) => _rootServiceProvider = sp;

    private IServiceProvider _serviceProvider
    {
        get
        {
            // We prefer the request scoped services if available, but this may also be executed through `IHostedService` and similar
            // so we can't require the HttpContext.
            // The main thing we're concerned about is that the lifetime of our services (e.g. internals of the process engine)
            // accidentally "root" app implemented services. By preferring the request scope we ensure any singleton we have
            // trying to get a request scoped service will get the one for the current (request) scope.
            // TODO: when we have the new process engine, we should model this differently.
            // We may be in a user request context OR in a process-engine "durable execution" context.
            var httpContextAccessor = _rootServiceProvider.GetService<IHttpContextAccessor>();
            if (httpContextAccessor?.HttpContext?.RequestServices is { } requestServices)
                return requestServices;

            return _rootServiceProvider;
        }
    }

    public T GetRequired<T>()
        where T : class => _serviceProvider.GetRequiredService<T>();

    public T? Get<T>()
        where T : class => _serviceProvider.GetService<T>();

    public IEnumerable<T> GetAll<T>()
        where T : class => _serviceProvider.GetServices<T>();
}

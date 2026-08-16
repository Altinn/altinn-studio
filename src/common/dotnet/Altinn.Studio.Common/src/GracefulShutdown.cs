using System;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;

namespace Altinn.Studio.Common;

internal static class GracefulShutdown
{
    internal static IServiceCollection AddGracefulShutdown(
        this IServiceCollection services,
        IHostEnvironment environment,
        TimeSpan endpointDrainDelay,
        TimeSpan applicationShutdownTimeout
    )
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(environment);

        if (endpointDrainDelay < TimeSpan.Zero)
            throw new ArgumentOutOfRangeException(
                nameof(endpointDrainDelay),
                "The endpoint drain delay cannot be negative."
            );
        if (applicationShutdownTimeout <= TimeSpan.Zero)
            throw new ArgumentOutOfRangeException(
                nameof(applicationShutdownTimeout),
                "The application shutdown timeout must be greater than zero."
            );

        if (environment.IsDevelopment())
            return services;

        services.TryAddSingleton(TimeProvider.System);
        services.AddSingleton<IHostLifetime>(serviceProvider =>
            ActivatorUtilities.CreateInstance<AppHostLifetime>(serviceProvider, endpointDrainDelay)
        );
        services.Configure<HostOptions>(options => options.ShutdownTimeout = applicationShutdownTimeout);

        return services;
    }
}

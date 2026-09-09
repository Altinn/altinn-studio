using System;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Altinn.Studio.Common;

/// <summary>
/// Extensions for configuring graceful host shutdown.
/// </summary>
public static class GracefulShutdownExtensions
{
    /// <summary>
    /// Delays host shutdown while endpoint removal propagates, then configures the time allowed to drain active work.
    /// </summary>
    /// <param name="services">The service collection to configure.</param>
    /// <param name="environment">The host environment.</param>
    /// <param name="endpointDrainDelay">Time allowed for endpoint removal to propagate.</param>
    /// <param name="applicationShutdownTimeout">Maximum time allowed for application shutdown.</param>
    /// <returns>The supplied service collection.</returns>
    public static IServiceCollection AddGracefulShutdown(
        this IServiceCollection services,
        IHostEnvironment environment,
        TimeSpan endpointDrainDelay,
        TimeSpan applicationShutdownTimeout
    ) =>
        GracefulShutdown.AddGracefulShutdown(
            services,
            environment,
            endpointDrainDelay,
            applicationShutdownTimeout
        );
}

using Microsoft.Extensions.DependencyInjection;
using OpenTelemetry.Trace;

internal static class OpenTelemetrySamplerConfiguration
{
    public static void RegisterServices(IServiceCollection services)
    {
        services.ConfigureOpenTelemetryTracerProvider(builder =>
        {
            builder.SetSampler(new ParentBasedSampler(new AlwaysOnSampler()));
        });
    }
}

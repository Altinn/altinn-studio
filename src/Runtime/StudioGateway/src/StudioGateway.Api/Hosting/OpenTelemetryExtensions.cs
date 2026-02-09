using System.Diagnostics;
using OpenTelemetry;
using OpenTelemetry.Logs;
using OpenTelemetry.Metrics;
using OpenTelemetry.Trace;
using StudioGateway.Api.Telemetry;

namespace StudioGateway.Api.Hosting;

internal static class OpenTelemetryExtensions
{
    public static WebApplicationBuilder AddOpenTelemetry(this WebApplicationBuilder builder)
    {
        builder
            .Services.AddOpenTelemetry()
            .WithTracing(tracing =>
            {
                tracing
                    .AddSource(ServiceTelemetry.Source.Name)
                    .AddProcessor(new AlwaysSampleTagProcessor())
                    .AddAspNetCoreInstrumentation(options =>
                    {
                        options.RecordException = true;
                        options.Filter = ctx => !ctx.Request.Path.StartsWithSegments("/health");
                    })
                    .AddHttpClientInstrumentation(options => options.RecordException = true)
                    .AddOtlpExporter();
            })
            .WithMetrics(metrics =>
            {
                metrics
                    .AddAspNetCoreInstrumentation()
                    .AddHttpClientInstrumentation()
                    .AddRuntimeInstrumentation()
                    .AddOtlpExporter();
            });

        builder.Logging.AddOpenTelemetry(logging =>
        {
            logging.IncludeFormattedMessage = true;
            logging.IncludeScopes = true;
            logging.ParseStateValues = true;
            logging.AddOtlpExporter();
        });

        return builder;
    }

    private sealed class AlwaysSampleTagProcessor : BaseProcessor<Activity>
    {
        public override void OnStart(Activity data)
        {
            data.SetAlwaysSample();
        }
    }
}

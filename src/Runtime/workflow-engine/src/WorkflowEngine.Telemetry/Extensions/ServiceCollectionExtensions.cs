using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using OpenTelemetry.Logs;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

namespace WorkflowEngine.Telemetry.Extensions;

public static class ServiceCollectionExtensions
{
    extension(IServiceCollection services)
    {
        public IServiceCollection AddTelemetry(bool enableSensitiveDataLogging = false)
        {
            if (enableSensitiveDataLogging)
                Environment.SetEnvironmentVariable(
                    "OTEL_DOTNET_EXPERIMENTAL_EFCORE_ENABLE_TRACE_DB_QUERY_PARAMETERS",
                    "true"
                );

            services
                .AddOpenTelemetry()
                .ConfigureResource(r =>
                    r.AddService(
                        serviceName: Metrics.ServiceName,
                        serviceVersion: Metrics.ServiceVersion,
                        serviceInstanceId: Environment.MachineName
                    )
                )
                .WithTracing(builder =>
                {
                    builder
                        .AddSource(Metrics.ServiceName)
                        .AddHttpClientInstrumentation(opts =>
                        {
                            opts.RecordException = true;
                        })
                        .AddAspNetCoreInstrumentation(opts =>
                        {
                            opts.RecordException = true;
                            opts.Filter = httpContext =>
                                httpContext.Request.Path.Value?.Contains("/health", StringComparison.OrdinalIgnoreCase)
                                    is not true;
                        })
                        .AddEntityFrameworkCoreInstrumentation(opts =>
                        {
                            opts.EnrichWithIDbCommand = (activity, command) =>
                            {
                                var commandType = command.CommandText switch
                                {
                                    var t when t.StartsWith("SELECT", StringComparison.OrdinalIgnoreCase) => "Select",
                                    var t when t.StartsWith("INSERT", StringComparison.OrdinalIgnoreCase) => "Insert",
                                    var t when t.StartsWith("UPDATE", StringComparison.OrdinalIgnoreCase) => "Update",
                                    var t when t.StartsWith("DELETE", StringComparison.OrdinalIgnoreCase) => "Delete",
                                    var t when t.StartsWith("CREATE", StringComparison.OrdinalIgnoreCase) => "Create",
                                    var t when t.StartsWith("ALTER", StringComparison.OrdinalIgnoreCase) => "Alter",
                                    var t when t.StartsWith("DROP", StringComparison.OrdinalIgnoreCase) => "Drop",
                                    var t when t.StartsWith("LOCK", StringComparison.OrdinalIgnoreCase) => "Lock",
                                    _ => "Unknown",
                                };

                                activity.DisplayName = $"SQL EFCore: {commandType} @ {command.Connection?.Database}";
                            };
                        })
                        .AddOtlpExporter(opts =>
                        {
                            opts.BatchExportProcessorOptions.MaxQueueSize = 8192;
                            opts.BatchExportProcessorOptions.MaxExportBatchSize = 1024;
                            opts.BatchExportProcessorOptions.ScheduledDelayMilliseconds = 2000;
                        });
                })
                .WithMetrics(builder =>
                {
                    builder
                        .AddMeter(Metrics.ServiceName)
                        .AddMeter("Microsoft.EntityFrameworkCore")
                        .AddRuntimeInstrumentation()
                        .AddHttpClientInstrumentation()
                        .AddAspNetCoreInstrumentation()
                        .AddOtlpExporter(
                            (_, reader) =>
                            {
                                reader.PeriodicExportingMetricReaderOptions.ExportIntervalMilliseconds = 10_000;
                            }
                        );
                });

            services.AddLogging(logging =>
            {
                logging.AddOpenTelemetry(options =>
                {
                    options.IncludeFormattedMessage = true;
                    options.AddOtlpExporter();
                });
            });

            return services;
        }
    }
}

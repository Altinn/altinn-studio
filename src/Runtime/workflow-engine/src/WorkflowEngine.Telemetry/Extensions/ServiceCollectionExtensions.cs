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
        public IServiceCollection AddTelemetry(
            bool emitQueryParameters = false,
            bool enableDatabaseInstrumentation = false
        )
        {
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
                            {
                                var path = httpContext.Request.Path.Value ?? "";
                                string[] excludedPaths = ["/health", "/dashboard"];
                                return !excludedPaths.Any(p => path.Contains(p, StringComparison.OrdinalIgnoreCase));
                            };
                        });

                    if (enableDatabaseInstrumentation)
                    {
                        builder.AddEntityFrameworkCoreInstrumentation(opts =>
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

                                if (emitQueryParameters && command.Parameters.Count > 0)
                                {
                                    var paramDict = new Dictionary<string, object?>(command.Parameters.Count);
                                    foreach (System.Data.IDbDataParameter param in command.Parameters)
                                        paramDict[param.ParameterName] = param.Value is DBNull ? null : param.Value;

                                    activity.SetTag(
                                        "db.statement.parameters",
                                        System.Text.Json.JsonSerializer.Serialize(paramDict)
                                    );
                                }
                            };
                        });
                    }

                    builder.AddOtlpExporter(opts =>
                    {
                        opts.BatchExportProcessorOptions.MaxQueueSize = 2048;
                        opts.BatchExportProcessorOptions.MaxExportBatchSize = 512;
                        opts.BatchExportProcessorOptions.ScheduledDelayMilliseconds = 2000;
                        opts.BatchExportProcessorOptions.ExporterTimeoutMilliseconds = 5000;
                    });
                })
                .WithMetrics(builder =>
                {
                    // Bucket boundaries (in seconds) for workflow/step/mainloop timing histograms.
                    // The default OTel boundaries (0, 5, 10, 25, ...) have no resolution below 5s,
                    // causing histogram_quantile to report ~4.8s for sub-second workflows.
                    double[] durationBuckets =
                    [
                        0.005,
                        0.01,
                        0.025,
                        0.05,
                        0.1,
                        0.25,
                        0.5,
                        1,
                        2.5,
                        5,
                        10,
                        30,
                        60,
                        120,
                        300,
                    ];
                    var durationView = new ExplicitBucketHistogramConfiguration { Boundaries = durationBuckets };

                    builder.AddMeter(Metrics.ServiceName);

                    if (enableDatabaseInstrumentation)
                    {
                        builder.AddMeter("Microsoft.EntityFrameworkCore").AddMeter("Npgsql");
                    }

                    builder
                        .AddView("engine.workflows.time.queue", durationView)
                        .AddView("engine.workflows.time.service", durationView)
                        .AddView("engine.workflows.time.total", durationView)
                        .AddView("engine.steps.time.queue", durationView)
                        .AddView("engine.steps.time.service", durationView)
                        .AddView("engine.steps.time.total", durationView)
                        .AddView("engine.mainloop.time.queue", durationView)
                        .AddView("engine.mainloop.time.service", durationView)
                        .AddView("engine.mainloop.time.total", durationView)
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

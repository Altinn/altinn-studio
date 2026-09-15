using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using OpenTelemetry.Logs;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

namespace WorkflowEngine.Telemetry.Extensions;

/// <summary>
/// Service collection extensions for registering the engine's OpenTelemetry pipeline.
/// </summary>
public static class ServiceCollectionExtensions
{
    extension(IServiceCollection services)
    {
        /// <summary>
        /// Registers the engine's OpenTelemetry pipeline (tracing, metrics, logs) and the OTLP exporter.
        /// </summary>
        /// <param name="emitQueryParameters">Include EF Core SQL parameter values on database spans. Disable in production to avoid PII leakage.</param>
        /// <param name="enableDatabaseInstrumentation">Enable EF Core and Npgsql tracing instrumentation. Implies <paramref name="enableDatabaseMetrics"/>.</param>
        /// <param name="enableDatabaseMetrics">Enable Npgsql connection pool and command metrics.</param>
        /// <param name="traceSamplingRate">Trace sampling rate between 0.0 (drop all) and 1.0 (keep all). Metrics and logs are always exported at full fidelity.</param>
        public IServiceCollection AddTelemetry(
            bool emitQueryParameters = false,
            bool enableDatabaseInstrumentation = false,
            bool enableDatabaseMetrics = true,
            double traceSamplingRate = 1.0
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
                    if (traceSamplingRate < 1.0)
                    {
                        builder.SetSampler(
                            new ParentBasedSampler(
                                new TraceIdRatioBasedSampler(Math.Clamp(traceSamplingRate, 0.0, 1.0))
                            )
                        );
                    }

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
                        builder.AddSource("Npgsql");
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
                    // Spans sub-millisecond (per-step DB write overhead) up to multi-minute workflows.
                    // Without sub-ms boundaries, histogram_quantile linearly interpolates inside the
                    // lowest bucket and pins to a constant value — e.g. P95 = 0.95 × 5ms = 4.75ms when
                    // all samples land in (0, 5ms].
                    double[] durationBuckets =
                    [
                        0.0001,
                        0.0005,
                        0.001,
                        0.0025,
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

                    // Bucket boundaries (in seconds) for mailbox receiver wake latency. A release is
                    // accelerated by NOTIFY (debounced 10ms) and bounded by the processor's 500ms idle
                    // poll, so the healthy population is entirely below where `durationBuckets` gets
                    // interesting — it needs resolution around the poll ceiling, not around 5 minutes.
                    // The tail past 1s is worker starvation rather than wake latency, so it is coarse.
                    double[] wakeLatencyBuckets =
                    [
                        0.0005,
                        0.001,
                        0.0025,
                        0.005,
                        0.01,
                        0.02,
                        0.05,
                        0.1,
                        0.2,
                        0.5,
                        1,
                        2,
                        5,
                        10,
                        30,
                        60,
                    ];
                    var wakeLatencyView = new ExplicitBucketHistogramConfiguration { Boundaries = wakeLatencyBuckets };

                    // Bucket boundaries (in seconds) for consumed step wait budget. The population runs
                    // from `MinStepDeferDelay` (1s) to `MaxStepWaitBudget` (14d), so every boundary in
                    // `durationBuckets` above 1s would sit inside a single decade of it and everything
                    // else would land in the +Inf overflow, where `histogram_quantile` cannot report at
                    // all. Boundaries at 86400 and 1209600 are the two configured budgets themselves —
                    // `DefaultStepWaitBudget` and the `MaxStepWaitBudget` cap — so "approaching budget"
                    // is a bucket an operator can read directly, and nothing overflows.
                    double[] waitBudgetBuckets =
                    [
                        1,
                        2,
                        5,
                        10,
                        30,
                        60,
                        300,
                        900,
                        1800,
                        3600,
                        10800,
                        21600,
                        43200,
                        86400,
                        259200,
                        604800,
                        1209600,
                    ];
                    var waitBudgetView = new ExplicitBucketHistogramConfiguration { Boundaries = waitBudgetBuckets };

                    builder.AddMeter(Metrics.ServiceName);

                    if (enableDatabaseInstrumentation)
                    {
                        builder.AddMeter("Microsoft.EntityFrameworkCore");
                    }

                    if (enableDatabaseMetrics)
                    {
                        builder.AddMeter("Npgsql");
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
                        .AddView("engine.mailboxes.receivers.wake_latency", wakeLatencyView)
                        .AddView("engine.steps.wait.duration", waitBudgetView)
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

using System.Data;
using System.Diagnostics;
using System.Globalization;
using System.Text.Json;
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
                            serviceInstanceId: Metrics.ServiceInstanceId
                        )
                        // Detected again after AddService, which would otherwise override them: a deployment's
                        // OTEL_SERVICE_NAME and OTEL_RESOURCE_ATTRIBUTES take precedence over these defaults.
                        .AddEnvironmentVariableDetector()
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
                        .AddHttpClientInstrumentation()
                        .AddAspNetCoreInstrumentation(opts =>
                        {
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

                                if (emitQueryParameters)
                                {
                                    SetQueryParameterTags(activity, command.Parameters);
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
                    // bounded by the processor's 500ms idle poll, so the healthy population is entirely
                    // below where `durationBuckets` gets interesting — it needs resolution around the
                    // poll ceiling, not around 5 minutes.
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

                    // Views match by instrument name, so they take it from the instrument: a stale name would
                    // silently leave the instrument on the SDK's default buckets.
                    builder
                        .AddView(Metrics.WorkflowQueueTime.Name, durationView)
                        .AddView(Metrics.WorkflowServiceTime.Name, durationView)
                        .AddView(Metrics.WorkflowTotalTime.Name, durationView)
                        .AddView(Metrics.StepQueueTime.Name, durationView)
                        .AddView(Metrics.StepServiceTime.Name, durationView)
                        .AddView(Metrics.StepTotalTime.Name, durationView)
                        .AddView(Metrics.EngineMainLoopQueueTime.Name, durationView)
                        .AddView(Metrics.EngineMainLoopServiceTime.Name, durationView)
                        .AddView(Metrics.EngineMainLoopTotalTime.Name, durationView)
                        .AddView(Metrics.MailboxReceiverWakeLatency.Name, wakeLatencyView)
                        .AddView(Metrics.StepWaitDuration.Name, waitBudgetView)
                        .AddRuntimeInstrumentation()
                        .AddHttpClientInstrumentation()
                        .AddAspNetCoreInstrumentation()
                        // The export interval is the deployment's to set, through OTEL_METRIC_EXPORT_INTERVAL.
                        .AddOtlpExporter();
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

    /// <summary>
    /// Sets one <c>db.query.parameter.&lt;name&gt;</c> attribute per parameter, as the semantic conventions name
    /// them: keyed by the parameter's name without its <c>@</c> placeholder prefix, or by its 0-based index when
    /// it has none, with a string representation of the value. A null value sets nothing.
    /// </summary>
    private static void SetQueryParameterTags(Activity activity, IDataParameterCollection parameters)
    {
        int index = 0;
        foreach (IDataParameter parameter in parameters)
        {
            var name = parameter.ParameterName.TrimStart('@');
            var key =
                TelemetryAttributes.DbQueryParameterPrefix
                + (name.Length > 0 ? name : index.ToString(CultureInfo.InvariantCulture));

            activity.SetTag(key, FormatQueryParameterValue(parameter.Value));
            index++;
        }
    }

    private static string? FormatQueryParameterValue(object? value) =>
        value switch
        {
            null or DBNull => null,
            string text => text,
            IFormattable formattable => formattable.ToString(null, CultureInfo.InvariantCulture),
            _ => JsonSerializer.Serialize(value),
        };
}

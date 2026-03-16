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
        public IServiceCollection AddTelemetry(bool emitQueryParameters = false)
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

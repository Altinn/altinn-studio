using System;
using System.Collections.Generic;
using System.Reflection;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using OpenTelemetry;
using OpenTelemetry.Instrumentation.AspNetCore;
using OpenTelemetry.Logs;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

namespace Altinn.Studio.Common.Telemetry;

/// <summary>
/// The OpenTelemetry setup every Studio service shares, as the observability standard decides.
/// </summary>
public static class AltinnStudioOpenTelemetry
{
    private const string LocalServiceVersion = "dev";
    private const string ProbePathPrefix = "/health";
    private const string OtlpEndpointVariable = "OTEL_EXPORTER_OTLP_ENDPOINT";

    extension(IServiceCollection services)
    {
        /// <summary>
        /// Registers OpenTelemetry with what every Studio service shares, and returns the builder for the service's own
        /// sources, meters and instrumentation. The shared part is:
        /// <list type="bullet">
        ///   <item>
        ///     The resource's <c>service.instance.id</c>, a UUID per process that <c>OTEL_RESOURCE_ATTRIBUTES</c> can
        ///     override, and its <c>service.version</c>, the informational version of
        ///     <paramref name="serviceAssembly"/>, which the deployment can't override.
        ///   </item>
        ///   <item>The <c>altinn.workload.start_time</c> gauge (<see cref="Workload"/>).</item>
        ///   <item>ASP.NET Core and HttpClient traces and metrics, with requests under <c>/health</c> left out of traces.</item>
        ///   <item>.NET runtime metrics.</item>
        ///   <item>OTLP export of all three signals when the deployment sets an endpoint, with logs only at Warning and above.</item>
        /// </list>
        /// </summary>
        /// <remarks>
        /// <para>
        /// The OTLP exporters are added only when the deployment sets <c>OTEL_EXPORTER_OTLP_ENDPOINT</c>. A service without
        /// a collector then sends nothing and logs no export errors, rather than falling back to the SDK's default
        /// endpoint. The per-signal endpoint variables don't turn exporting on. The exporters read the endpoint, the
        /// protocol and the other <c>OTEL_*</c> settings themselves, and the deployment sets the export interval with
        /// <c>OTEL_METRIC_EXPORT_INTERVAL</c>.
        /// </para>
        /// <para>
        /// Exceptions aren't recorded as span events. Set <c>error.type</c> on the span and log the exception at Error.
        /// </para>
        /// <para>
        /// Set the options of the shared ASP.NET Core and HttpClient instrumentation with
        /// <c>services.Configure&lt;AspNetCoreTraceInstrumentationOptions&gt;</c> and
        /// <c>services.Configure&lt;HttpClientTraceInstrumentationOptions&gt;</c>. A <c>Filter</c> set there applies in
        /// addition to the shared one. Log scopes are off, since they can carry request paths. A service that wants them
        /// sets <c>IncludeScopes</c> with <c>services.Configure&lt;OpenTelemetryLoggerOptions&gt;</c>. Probe endpoints also
        /// call <c>DisableHttpMetrics()</c> to stay out of the request metrics.
        /// </para>
        /// <para>
        /// The OTLP exporters are added here, before the service's own processors. A processor that changes a span when it
        /// starts, such as one that marks it to be kept, works as usual. A processor that changes a span when it ends runs
        /// after the exporter has the span.
        /// </para>
        /// </remarks>
        /// <param name="configuration">The host's configuration, from which the OTLP endpoint variable is read.</param>
        /// <param name="serviceAssembly">The service's own assembly, whose informational version is the
        /// <c>service.version</c>. An image build sets it with <c>/p:InformationalVersion=…</c>.</param>
        /// <param name="defaultServiceName">The <c>service.name</c> when the deployment sets no <c>OTEL_SERVICE_NAME</c>.</param>
        public OpenTelemetryBuilder AddAltinnStudioOpenTelemetry(
            IConfiguration configuration,
            Assembly serviceAssembly,
            string? defaultServiceName = null
        )
        {
            ArgumentNullException.ThrowIfNull(configuration);
            ArgumentNullException.ThrowIfNull(serviceAssembly);
            string serviceVersion = ServiceVersionOf(serviceAssembly);
            bool export = !string.IsNullOrWhiteSpace(configuration[OtlpEndpointVariable]);

            services.PostConfigure<AspNetCoreTraceInstrumentationOptions>(options =>
            {
                Func<HttpContext, bool>? serviceFilter = options.Filter;
                options.Filter = context => !IsProbe(context.Request) && (serviceFilter?.Invoke(context) ?? true);
            });

            // The pipeline drops log records below WARN, so they aren't exported. Other log providers still get them.
            services.AddLogging(logging =>
                logging.AddFilter<OpenTelemetryLoggerProvider>(category: null, LogLevel.Warning)
            );

            return services
                .AddOpenTelemetry()
                .ConfigureResource(resource =>
                {
                    if (defaultServiceName is not null)
                    {
                        resource.AddService(defaultServiceName, autoGenerateServiceInstanceId: false);
                    }

                    resource
                        .AddAttributes([new KeyValuePair<string, object>("service.instance.id", Workload.InstanceId)])
                        // Detected again after the defaults above, so that the deployment's OTEL_SERVICE_NAME and
                        // OTEL_RESOURCE_ATTRIBUTES take precedence over them.
                        .AddEnvironmentVariableDetector()
                        .AddAttributes([new KeyValuePair<string, object>("service.version", serviceVersion)]);
                })
                .WithTracing(tracing =>
                {
                    tracing.AddAspNetCoreInstrumentation().AddHttpClientInstrumentation();
                    if (export)
                    {
                        tracing.AddOtlpExporter();
                    }
                })
                .WithMetrics(metrics =>
                {
                    metrics
                        .AddMeter(Workload.StartTime.Meter.Name)
                        .AddAspNetCoreInstrumentation()
                        .AddHttpClientInstrumentation()
                        .AddRuntimeInstrumentation();
                    if (export)
                    {
                        metrics.AddOtlpExporter();
                    }
                })
                .WithLogging(
                    logging =>
                    {
                        if (export)
                        {
                            logging.AddOtlpExporter();
                        }
                    },
                    options => options.IncludeFormattedMessage = true
                );
        }
    }

    /// <summary>
    /// The <c>service.version</c> of a service: its assembly's informational version, or <c>dev</c> when it has none.
    /// </summary>
    /// <remarks>
    /// The .NET SDK gives every assembly an informational version, by default <c>1.0.0</c> with the commit appended.
    /// A service's project therefore sets <c>&lt;InformationalVersion&gt;dev&lt;/InformationalVersion&gt;</c> and
    /// <c>&lt;IncludeSourceRevisionInInformationalVersion&gt;false&lt;/IncludeSourceRevisionInInformationalVersion&gt;</c>,
    /// so that a local build reports <c>dev</c> and an image build exactly the version it passes.
    /// </remarks>
    public static string ServiceVersionOf(Assembly serviceAssembly)
    {
        ArgumentNullException.ThrowIfNull(serviceAssembly);
        string? version = serviceAssembly
            .GetCustomAttribute<AssemblyInformationalVersionAttribute>()
            ?.InformationalVersion;
        return string.IsNullOrWhiteSpace(version) ? LocalServiceVersion : version;
    }

    private static bool IsProbe(HttpRequest request) =>
        request.Path.StartsWithSegments(ProbePathPrefix, StringComparison.OrdinalIgnoreCase);
}

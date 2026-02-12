using Microsoft.Extensions.Options;
using OpenTelemetry.Logs;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using WorkflowEngine.Api.Constants;
using WorkflowEngine.Data.Extensions;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience;

namespace WorkflowEngine.Api.Extensions;

internal static class ServiceCollectionExtensions
{
    extension(IServiceCollection services)
    {
        /// <summary>
        /// Adds the workflow engine host and required services.
        /// </summary>
        public IServiceCollection AddWorkflowEngineHost(
            string engineConfigSection = "EngineSettings",
            string apiConfigSection = "ApiSettings",
            string appCommandConfigSection = "AppCommandSettings"
        )
        {
            if (!services.IsConfigured<EngineSettings>())
                services.ConfigureEngine(engineConfigSection);

            if (!services.IsConfigured<ApiSettings>())
                services.ConfigureApi(apiConfigSection);

            if (!services.IsConfigured<AppCommandSettings>())
                services.ConfigureAppCommand(appCommandConfigSection);

            services
                .AddHttpClient()
                .ConfigureHttpClientDefaults(builder =>
                {
                    builder.ConfigurePrimaryHttpMessageHandler(() =>
                        new SocketsHttpHandler { PooledConnectionLifetime = TimeSpan.FromMinutes(2) }
                    );
                });
            services.AddSingleton<ConcurrencyLimiter>(sp =>
            {
                var settings = sp.GetRequiredService<IOptions<EngineSettings>>().Value;
                return new ConcurrencyLimiter(settings.MaxConcurrentDbOperations, settings.MaxConcurrentHttpCalls);
            });
            services.AddSingleton<IEngine, Engine>();
            services.AddSingleton<IWorkflowExecutor, WorkflowExecutor>();
            services.AddHostedService<EngineHost>();

            return services;
        }

        public IServiceCollection AddTelemetry()
        {
            services.AddHostedService<MetricsCollector>();
            services
                .AddOpenTelemetry()
                .ConfigureResource(r =>
                    r.AddService(
                        serviceName: Telemetry.ServiceName,
                        serviceVersion: Telemetry.ServiceVersion,
                        serviceInstanceId: Environment.MachineName
                    )
                )
                .WithTracing(builder =>
                {
                    builder
                        .AddSource(Telemetry.ServiceName)
                        .AddHttpClientInstrumentation(opts =>
                        {
                            opts.RecordException = true;
                        })
                        .AddAspNetCoreInstrumentation(opts =>
                        {
                            opts.RecordException = true;
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
                        .AddOtlpExporter();
                })
                .WithMetrics(builder =>
                {
                    builder
                        .AddMeter(Telemetry.ServiceName)
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

        /// <summary>
        /// Configures the process engine settings by binding to a configuration section.
        /// </summary>
        public IServiceCollection ConfigureEngine(string configSectionPath)
        {
            services
                .AddOptions<EngineSettings>()
                .BindConfiguration(configSectionPath)
                .SetEngineSettingsDefaults()
                .ValidateEngineSettings();

            return services;
        }

        /// <summary>
        /// Configures the process engine settings using a delegate.
        /// </summary>
        public IServiceCollection ConfigureEngine(Action<EngineSettings> configureOptions)
        {
            services
                .AddOptions<EngineSettings>()
                .Configure(configureOptions)
                .SetEngineSettingsDefaults()
                .ValidateEngineSettings();
            return services;
        }

        public IServiceCollection ConfigureApi(string configSectionPath)
        {
            services.AddOptions<ApiSettings>().BindConfiguration(configSectionPath).ValidateApiSettings();
            return services;
        }

        public IServiceCollection ConfigureApi(Action<ApiSettings> configureOptions)
        {
            services.AddOptions<ApiSettings>().Configure(configureOptions).ValidateApiSettings();
            return services;
        }

        public IServiceCollection ConfigureAppCommand(string configSectionPath)
        {
            services
                .AddOptions<AppCommandSettings>()
                .BindConfiguration(configSectionPath)
                .SetAppCommandDefaults()
                .ValidateAppCommandSettings();

            return services;
        }

        public IServiceCollection ConfigureAppCommand(Action<AppCommandSettings> configureOptions)
        {
            services
                .AddOptions<AppCommandSettings>()
                .Configure(configureOptions)
                .SetAppCommandDefaults()
                .ValidateAppCommandSettings();

            return services;
        }

        /// <summary>
        /// Adds health checks.
        /// </summary>
        /// <returns></returns>
        public IServiceCollection AddEngineHealthChecks()
        {
            services.AddHealthChecks().AddCheck<EngineHealthCheck>("Engine", tags: ["ready"]);
            services.AddDbContextHealthCheck("Database", ["ready", "dependencies"]);

            return services;
        }

        /// <summary>
        /// Checks if the specified options type has already been configured in the service collection.
        /// </summary>
        private bool IsConfigured<TOptions>()
            where TOptions : class
        {
            return services.Any(d =>
                d.ServiceType == typeof(IConfigureOptions<TOptions>)
                || d.ServiceType == typeof(IOptionsChangeTokenSource<TOptions>)
            );
        }
    }
}

internal static class OptionsBuilderExtensions
{
    extension(OptionsBuilder<EngineSettings> builder)
    {
        /// <summary>
        /// Ensures that all <see cref="EngineSettings"/> properties fall back to <see cref="Defaults"/> if not provided
        /// </summary>
        public OptionsBuilder<EngineSettings> SetEngineSettingsDefaults()
        {
            builder.PostConfigure(config =>
            {
                if (config.QueueCapacity <= 0)
                    config.QueueCapacity = Defaults.EngineSettings.QueueCapacity;

                if (config.DefaultStepCommandTimeout <= TimeSpan.Zero)
                    config.DefaultStepCommandTimeout = Defaults.EngineSettings.DefaultStepCommandTimeout;

                if (config.DatabaseCommandTimeout <= TimeSpan.Zero)
                    config.DatabaseCommandTimeout = Defaults.EngineSettings.DatabaseCommandTimeout;

                config.DefaultStepRetryStrategy ??= Defaults.EngineSettings.DefaultStepRetryStrategy;
                config.DatabaseRetryStrategy ??= Defaults.EngineSettings.DatabaseRetryStrategy;

                if (config.MaxConcurrentDbOperations <= 0)
                    config.MaxConcurrentDbOperations = Defaults.EngineSettings.MaxConcurrentDbOperations;

                if (config.MaxConcurrentHttpCalls <= 0)
                    config.MaxConcurrentHttpCalls = Defaults.EngineSettings.MaxConcurrentHttpCalls;

                if (config.MaxDegreeOfParallelism <= 0)
                    config.MaxDegreeOfParallelism = Defaults.EngineSettings.MaxDegreeOfParallelism;
            });

            return builder;
        }

        /// <summary>
        /// Performs basic validation for <see cref="EngineSettings"/>
        /// </summary>
        public OptionsBuilder<EngineSettings> ValidateEngineSettings()
        {
            const string ns = nameof(EngineSettings);

            builder.Validate(
                config => config.QueueCapacity > 0,
                $"{ns}.{nameof(EngineSettings.QueueCapacity)} must be greater than zero."
            );

            builder.Validate(
                config => config.DefaultStepCommandTimeout > TimeSpan.Zero,
                $"{ns}.{nameof(EngineSettings.DefaultStepCommandTimeout)} must be greater than zero."
            );

            builder.Validate(
                config => config.DatabaseCommandTimeout > TimeSpan.Zero,
                $"{ns}.{nameof(EngineSettings.DatabaseCommandTimeout)} must be greater than zero."
            );

            return builder;
        }
    }

    extension(OptionsBuilder<AppCommandSettings> builder)
    {
        public OptionsBuilder<AppCommandSettings> ValidateAppCommandSettings()
        {
            const string ns = nameof(AppCommandSettings);

            builder.Validate(
                config => !string.IsNullOrEmpty(config.ApiKey),
                $"{ns}.{nameof(AppCommandSettings.ApiKey)} value is missing."
            );

            builder.Validate(
                config => Uri.TryCreate(config.CommandEndpoint, UriKind.Absolute, out _),
                $"{ns}.{nameof(AppCommandSettings.CommandEndpoint)} does not appear to be a valid URL."
            );

            return builder;
        }

        public OptionsBuilder<AppCommandSettings> SetAppCommandDefaults()
        {
            // Note: Don't offer to set API key here, it should always be explicitly set in the config.
            builder.PostConfigure(config =>
            {
                config.CommandEndpoint ??= Defaults.AppCommandSettings.CommandEndpoint;
            });

            return builder;
        }
    }

    extension(OptionsBuilder<ApiSettings> builder)
    {
        public OptionsBuilder<ApiSettings> ValidateApiSettings()
        {
            const string ns = nameof(ApiSettings);

            builder.Validate(
                config => config.ApiKeys.Any(),
                $"{ns}.{nameof(ApiSettings.ApiKeys)} value is missing or empty."
            );

            builder.Validate(
                config => config.ApiKeys.All(x => x is { Length: > 10 }),
                $"{ns}.{nameof(ApiSettings.ApiKeys)} contains null value or key with insufficient length."
            );

            return builder;
        }
    }
}

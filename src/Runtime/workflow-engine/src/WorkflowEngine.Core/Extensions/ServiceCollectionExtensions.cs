using System.Diagnostics;
using Altinn.Studio.Runtime.Common;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using WorkflowEngine.Core.Constants;
using WorkflowEngine.Data.Extensions;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Abstractions;
using WorkflowEngine.Resilience;

namespace WorkflowEngine.Core.Extensions;

public static class ServiceCollectionExtensions
{
    extension(IServiceCollection services)
    {
        /// <summary>
        /// Adds the workflow engine host and required services.
        /// </summary>
        public IServiceCollection AddWorkflowEngineHost(
            string engineConfigSection = "EngineSettings",
            string apiConfigSection = "ApiSettings"
        )
        {
            if (!services.IsConfigured<EngineSettings>())
                services.ConfigureEngine(engineConfigSection);

            if (!services.IsConfigured<ApiSettings>())
                services.ConfigureApi(apiConfigSection);

            // Command plugin system
            services.AddSingleton<ICommandRegistry>(sp =>
            {
                var commands = sp.GetServices<ICommand>();
                return new CommandRegistry(commands);
            });

            services
                .AddHttpClient()
                .ConfigureHttpClientDefaults(builder =>
                {
                    builder.ConfigurePrimaryHttpMessageHandler(() =>
                        new SocketsHttpHandler { PooledConnectionLifetime = TimeSpan.FromMinutes(2) }
                    );
                });
            services.AddSingleton<IConcurrencyLimiter, ConcurrencyLimiter>(sp =>
            {
                var settings = sp.GetRequiredService<IOptions<EngineSettings>>().Value;
                return new ConcurrencyLimiter(
                    settings.Concurrency.MaxDbOperations,
                    settings.Concurrency.MaxHttpCalls,
                    settings.Concurrency.MaxWorkers
                );
            });

            services.AddSingleton<Engine>();
            services.AddSingleton<IEngine>(sp => sp.GetRequiredService<Engine>());
            services.AddSingleton<IEngineStatus>(sp => sp.GetRequiredService<Engine>());

            services.AddSingleton<IWorkflowExecutor, WorkflowExecutor>();

            services.AddSingleton<AsyncSignal>();
            services.AddSingleton<InFlightTracker>();

            services.AddSingleton<WorkflowWriteBuffer>();
            services.AddHostedService(sp => sp.GetRequiredService<WorkflowWriteBuffer>());

            services.AddSingleton<WorkflowUpdateBuffer>();
            services.AddSingleton<IWorkflowUpdateBuffer>(sp => sp.GetRequiredService<WorkflowUpdateBuffer>());
            services.AddHostedService(sp => sp.GetRequiredService<WorkflowUpdateBuffer>());

            services.AddHostedService<WorkflowProcessor>();
            services.AddHostedService<HeartbeatService>();

            services.AddScoped<WorkflowHandler>();

            services.AddHostedService<MetricsCollector>();

            services.Configure<HostOptions>(o => o.ShutdownTimeout = TimeSpan.FromMinutes(2));

            return services;
        }

        /// <summary>
        /// Registers a command with the engine.
        /// </summary>
        public IServiceCollection AddCommand<TDescriptor>()
            where TDescriptor : class, ICommand
        {
            services.AddSingleton<ICommand, TDescriptor>();
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

        /// <summary>
        /// Adds health checks.
        /// </summary>
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

public static class OptionsBuilderExtensions
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
                if (config.MetricsCollectionInterval <= TimeSpan.Zero)
                    config.MetricsCollectionInterval = Defaults.EngineSettings.MetricsCollectionInterval;

                if (config.DefaultStepCommandTimeout <= TimeSpan.Zero)
                    config.DefaultStepCommandTimeout = Defaults.EngineSettings.DefaultStepCommandTimeout;

                if (config.DatabaseCommandTimeout <= TimeSpan.Zero)
                    config.DatabaseCommandTimeout = Defaults.EngineSettings.DatabaseCommandTimeout;

                config.DefaultStepRetryStrategy ??= Defaults.EngineSettings.DefaultStepRetryStrategy;
                config.DatabaseRetryStrategy ??= Defaults.EngineSettings.DatabaseRetryStrategy;

                if (config.HeartbeatInterval <= TimeSpan.Zero)
                    config.HeartbeatInterval = Defaults.EngineSettings.HeartbeatInterval;

                if (config.StaleWorkflowThreshold <= TimeSpan.Zero)
                    config.StaleWorkflowThreshold = Defaults.EngineSettings.StaleWorkflowThreshold;

                if (config.MaxReclaimCount <= 0)
                    config.MaxReclaimCount = Defaults.EngineSettings.MaxReclaimCount;

                if (config.MaxWorkflowsPerRequest <= 0)
                    config.MaxWorkflowsPerRequest = Defaults.EngineSettings.MaxWorkflowsPerRequest;

                if (config.MaxStepsPerWorkflow <= 0)
                    config.MaxStepsPerWorkflow = Defaults.EngineSettings.MaxStepsPerWorkflow;

                if (config.MaxLabels <= 0)
                    config.MaxLabels = Defaults.EngineSettings.MaxLabels;

                if (config.Concurrency.MaxWorkers <= 0)
                    config.Concurrency.MaxWorkers = Defaults.EngineSettings.Concurrency.MaxWorkers;

                if (config.Concurrency.MaxDbOperations <= 0)
                    config.Concurrency.MaxDbOperations = Defaults.EngineSettings.Concurrency.MaxDbOperations;

                if (config.Concurrency.MaxHttpCalls <= 0)
                    config.Concurrency.MaxHttpCalls = Defaults.EngineSettings.Concurrency.MaxHttpCalls;

                if (config.Concurrency.BackpressureThreshold <= 0)
                    config.Concurrency.BackpressureThreshold = Defaults
                        .EngineSettings
                        .Concurrency
                        .BackpressureThreshold;

                ApplyBufferDefaults(config.WriteBuffer, Defaults.EngineSettings.WriteBuffer);
                ApplyBufferDefaults(config.UpdateBuffer, Defaults.EngineSettings.UpdateBuffer);

                static void ApplyBufferDefaults(BufferSettings target, BufferSettings defaults)
                {
                    if (target.MaxBatchSize <= 0)
                        target.MaxBatchSize = defaults.MaxBatchSize;

                    if (target.MaxQueueSize <= 0)
                        target.MaxQueueSize = defaults.MaxQueueSize;

                    if (target.FlushConcurrency <= 0)
                        target.FlushConcurrency = defaults.FlushConcurrency;
                }
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
                config => config.DefaultStepCommandTimeout > TimeSpan.Zero,
                $"{ns}.{nameof(EngineSettings.DefaultStepCommandTimeout)} must be greater than zero."
            );

            builder.Validate(
                config => config.DatabaseCommandTimeout > TimeSpan.Zero,
                $"{ns}.{nameof(EngineSettings.DatabaseCommandTimeout)} must be greater than zero."
            );

            builder.Validate(
                config => config.StaleWorkflowThreshold > config.HeartbeatInterval,
                $"{ns}.{nameof(EngineSettings.StaleWorkflowThreshold)} must be greater than {ns}.{nameof(EngineSettings.HeartbeatInterval)}."
            );

            builder.Validate(
                config => config.Concurrency.BackpressureThreshold >= config.WriteBuffer.MaxQueueSize,
                $"{ns}.{nameof(EngineSettings.Concurrency)}.{nameof(EngineSettings.Concurrency.BackpressureThreshold)} must be greater than or equal to {ns}.{nameof(EngineSettings.WriteBuffer)}.{nameof(EngineSettings.WriteBuffer.MaxQueueSize)}."
            );

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

using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;
using WorkflowEngine.Core.Constants;
using WorkflowEngine.Data.Extensions;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Abstractions;
using WorkflowEngine.Resilience;

namespace WorkflowEngine.Core.Extensions;

/// <summary>
/// Service collection extensions for composing the workflow engine into a host (DI registration of
/// core services, command plugins, settings binding, and engine health checks).
/// </summary>
public static class ServiceCollectionExtensions
{
    extension(IServiceCollection services)
    {
        /// <summary>
        /// Adds the workflow engine host and required services.
        /// </summary>
        public IServiceCollection AddWorkflowEngineHost(string engineConfigSection = "EngineSettings")
        {
            if (!services.IsConfigured<EngineSettings>())
                services.ConfigureEngine(engineConfigSection);

            services.TryAddSingleton(TimeProvider.System);

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
            services.AddSingleton<StatusChangeSignal>();
            services.AddHostedService(sp => sp.GetRequiredService<StatusChangeSignal>());
            services.AddSingleton<InFlightTracker>();

            services.AddSingleton<WorkflowWriteBuffer>();
            services.AddHostedService(sp => sp.GetRequiredService<WorkflowWriteBuffer>());

            services.AddSingleton<WorkflowUpdateBuffer>();
            services.AddSingleton<IWorkflowUpdateBuffer>(sp => sp.GetRequiredService<WorkflowUpdateBuffer>());
            services.AddHostedService(sp => sp.GetRequiredService<WorkflowUpdateBuffer>());

            // HeartbeatService must be registered BEFORE the processor so it is stopped
            // AFTER it (hosted services are stopped in reverse registration order).
            // The heartbeat loop continues while the tracker is non-empty, which requires
            // the processor's workers to finish first.
            services.AddHostedService<HeartbeatService>();
            services.AddHostedService<CancellationWatcherService>();
            services.AddHostedService<WorkflowProcessor>();
            services.AddHostedService<MetricsCollector>();

            services.AddScoped<WorkflowHandler>();

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

/// <summary>
/// Extensions over <see cref="OptionsBuilder{TOptions}"/> for <see cref="EngineSettings"/> default-fill and validation.
/// </summary>
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
                config.DefaultStepRetryStrategy ??= Defaults.EngineSettings.DefaultStepRetryStrategy;
                config.DatabaseRetryStrategy ??= Defaults.EngineSettings.DatabaseRetryStrategy;

                if (config.MetricsCollectionInterval <= TimeSpan.Zero)
                    config.MetricsCollectionInterval = Defaults.EngineSettings.MetricsCollectionInterval;

                if (config.DefaultStepCommandTimeout <= TimeSpan.Zero)
                    config.DefaultStepCommandTimeout = Defaults.EngineSettings.DefaultStepCommandTimeout;

                if (config.DatabaseCommandTimeout <= TimeSpan.Zero)
                    config.DatabaseCommandTimeout = Defaults.EngineSettings.DatabaseCommandTimeout;

                if (config.HeartbeatInterval <= TimeSpan.Zero)
                    config.HeartbeatInterval = Defaults.EngineSettings.HeartbeatInterval;

                if (config.StaleWorkflowThreshold <= TimeSpan.Zero)
                    config.StaleWorkflowThreshold = Defaults.EngineSettings.StaleWorkflowThreshold;

                if (config.MaxReclaimCount <= 0)
                    config.MaxReclaimCount = Defaults.EngineSettings.MaxReclaimCount;

                if (config.CancellationWatcherInterval <= TimeSpan.Zero)
                    config.CancellationWatcherInterval = Defaults.EngineSettings.CancellationWatcherInterval;

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

                if (config.Retention.RetentionPeriod <= TimeSpan.Zero)
                    config.Retention.RetentionPeriod = Defaults.EngineSettings.Retention.RetentionPeriod;

                if (config.Retention.BatchSize <= 0)
                    config.Retention.BatchSize = Defaults.EngineSettings.Retention.BatchSize;

                if (config.Retention.Interval <= TimeSpan.Zero)
                    config.Retention.Interval = Defaults.EngineSettings.Retention.Interval;

                if (config.WriteBuffer.MaxBatchSize <= 0)
                    config.WriteBuffer.MaxBatchSize = Defaults.EngineSettings.WriteBuffer.MaxBatchSize;

                if (config.WriteBuffer.MaxQueueSize <= 0)
                    config.WriteBuffer.MaxQueueSize = Defaults.EngineSettings.WriteBuffer.MaxQueueSize;

                if (config.WriteBuffer.FlushConcurrency <= 0)
                    config.WriteBuffer.FlushConcurrency = Defaults.EngineSettings.WriteBuffer.FlushConcurrency;

                if (config.UpdateBuffer.MaxBatchSize <= 0)
                    config.UpdateBuffer.MaxBatchSize = Defaults.EngineSettings.UpdateBuffer.MaxBatchSize;

                if (config.UpdateBuffer.MaxQueueSize <= 0)
                    config.UpdateBuffer.MaxQueueSize = Defaults.EngineSettings.UpdateBuffer.MaxQueueSize;
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

            builder.Validate(
                config => config.Retention.RetentionPeriod > TimeSpan.Zero,
                $"{ns}.{nameof(EngineSettings.Retention)}.{nameof(RetentionSettings.RetentionPeriod)} must be greater than zero."
            );

            builder.Validate(
                config => config.Retention.BatchSize > 0,
                $"{ns}.{nameof(EngineSettings.Retention)}.{nameof(RetentionSettings.BatchSize)} must be greater than zero."
            );

            builder.Validate(
                config => config.Retention.Interval > TimeSpan.Zero,
                $"{ns}.{nameof(EngineSettings.Retention)}.{nameof(RetentionSettings.Interval)} must be greater than zero."
            );

            return builder;
        }
    }
}

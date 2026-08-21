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

            // Registered here so they are stopped after everything below it (reverse registration order): the
            // shutdown drain that answers their queued callers has to outlive request handling.
            services.AddSingleton<MailboxMintBuffer>();
            services.AddHostedService(sp => sp.GetRequiredService<MailboxMintBuffer>());

            services.AddSingleton<MailboxCloseBuffer>();
            services.AddHostedService(sp => sp.GetRequiredService<MailboxCloseBuffer>());

            services.AddSingleton<MailboxDeliveryBuffer>();
            services.AddHostedService(sp => sp.GetRequiredService<MailboxDeliveryBuffer>());

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

                if (config.MaxStepCommandTimeout <= TimeSpan.Zero)
                    config.MaxStepCommandTimeout = Defaults.EngineSettings.MaxStepCommandTimeout;

                if (config.DefaultStepWaitBudget <= TimeSpan.Zero)
                    config.DefaultStepWaitBudget = Defaults.EngineSettings.DefaultStepWaitBudget;

                if (config.MaxStepWaitBudget <= TimeSpan.Zero)
                    config.MaxStepWaitBudget = Defaults.EngineSettings.MaxStepWaitBudget;

                if (config.MinStepDeferDelay <= TimeSpan.Zero)
                    config.MinStepDeferDelay = Defaults.EngineSettings.MinStepDeferDelay;

                if (config.MaxMailboxTimeout <= TimeSpan.Zero)
                    config.MaxMailboxTimeout = Defaults.EngineSettings.MaxMailboxTimeout;

                if (config.MaxOpenMailboxesPerCollection <= 0)
                    config.MaxOpenMailboxesPerCollection = Defaults.EngineSettings.MaxOpenMailboxesPerCollection;

                if (config.MaxMailboxPayloadSize <= 0)
                    config.MaxMailboxPayloadSize = Defaults.EngineSettings.MaxMailboxPayloadSize;

                if (config.MaxMailboxLogLength <= 0)
                    config.MaxMailboxLogLength = Defaults.EngineSettings.MaxMailboxLogLength;

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

                if (config.MaintenanceInterval <= TimeSpan.Zero)
                    config.MaintenanceInterval = Defaults.EngineSettings.MaintenanceInterval;

                if (config.MailboxSweepInterval <= TimeSpan.Zero)
                    config.MailboxSweepInterval = Defaults.EngineSettings.MailboxSweepInterval;

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

                if (config.MailboxBuffers.Mint.MaxBatchSize <= 0)
                    config.MailboxBuffers.Mint.MaxBatchSize = Defaults.EngineSettings.MailboxBuffers.Mint.MaxBatchSize;

                if (config.MailboxBuffers.Mint.MaxQueueSize <= 0)
                    config.MailboxBuffers.Mint.MaxQueueSize = Defaults.EngineSettings.MailboxBuffers.Mint.MaxQueueSize;

                if (config.MailboxBuffers.Mint.FlushConcurrency <= 0)
                    config.MailboxBuffers.Mint.FlushConcurrency = Defaults
                        .EngineSettings
                        .MailboxBuffers
                        .Mint
                        .FlushConcurrency;

                if (config.MailboxBuffers.Close.MaxBatchSize <= 0)
                    config.MailboxBuffers.Close.MaxBatchSize = Defaults
                        .EngineSettings
                        .MailboxBuffers
                        .Close
                        .MaxBatchSize;

                if (config.MailboxBuffers.Close.MaxQueueSize <= 0)
                    config.MailboxBuffers.Close.MaxQueueSize = Defaults
                        .EngineSettings
                        .MailboxBuffers
                        .Close
                        .MaxQueueSize;

                if (config.MailboxBuffers.Close.FlushConcurrency <= 0)
                    config.MailboxBuffers.Close.FlushConcurrency = Defaults
                        .EngineSettings
                        .MailboxBuffers
                        .Close
                        .FlushConcurrency;

                if (config.MailboxBuffers.Delivery.MaxBatchSize <= 0)
                    config.MailboxBuffers.Delivery.MaxBatchSize = Defaults
                        .EngineSettings
                        .MailboxBuffers
                        .Delivery
                        .MaxBatchSize;

                if (config.MailboxBuffers.Delivery.MaxQueueSize <= 0)
                    config.MailboxBuffers.Delivery.MaxQueueSize = Defaults
                        .EngineSettings
                        .MailboxBuffers
                        .Delivery
                        .MaxQueueSize;

                if (config.MailboxBuffers.Delivery.FlushConcurrency <= 0)
                    config.MailboxBuffers.Delivery.FlushConcurrency = Defaults
                        .EngineSettings
                        .MailboxBuffers
                        .Delivery
                        .FlushConcurrency;
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
                config => config.MaxStepCommandTimeout >= config.DefaultStepCommandTimeout,
                $"{ns}.{nameof(EngineSettings.MaxStepCommandTimeout)} must be greater than or equal to {ns}.{nameof(EngineSettings.DefaultStepCommandTimeout)}."
            );

            builder.Validate(
                config => config.DefaultStepWaitBudget > TimeSpan.Zero,
                $"{ns}.{nameof(EngineSettings.DefaultStepWaitBudget)} must be greater than zero."
            );

            builder.Validate(
                config => config.MaxStepWaitBudget >= config.DefaultStepWaitBudget,
                $"{ns}.{nameof(EngineSettings.MaxStepWaitBudget)} must be greater than or equal to {ns}.{nameof(EngineSettings.DefaultStepWaitBudget)}."
            );

            builder.Validate(
                config => config.MinStepDeferDelay > TimeSpan.Zero,
                $"{ns}.{nameof(EngineSettings.MinStepDeferDelay)} must be greater than zero."
            );

            builder.Validate(
                config => config.MinStepDeferDelay <= config.DefaultStepWaitBudget,
                $"{ns}.{nameof(EngineSettings.MinStepDeferDelay)} must be less than or equal to {ns}.{nameof(EngineSettings.DefaultStepWaitBudget)}."
            );

            builder.Validate(
                config => config.MaxMailboxTimeout > TimeSpan.Zero,
                $"{ns}.{nameof(EngineSettings.MaxMailboxTimeout)} must be greater than zero."
            );

            builder.Validate(
                config => config.MaxOpenMailboxesPerCollection > 0,
                $"{ns}.{nameof(EngineSettings.MaxOpenMailboxesPerCollection)} must be greater than zero."
            );

            builder.Validate(
                config => config.MaxMailboxPayloadSize > 0,
                $"{ns}.{nameof(EngineSettings.MaxMailboxPayloadSize)} must be greater than zero."
            );

            builder.Validate(
                config => config.MaxMailboxLogLength > 0,
                $"{ns}.{nameof(EngineSettings.MaxMailboxLogLength)} must be greater than zero."
            );

            builder.Validate(
                config => config.MailboxSweepInterval > TimeSpan.Zero,
                $"{ns}.{nameof(EngineSettings.MailboxSweepInterval)} must be greater than zero."
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

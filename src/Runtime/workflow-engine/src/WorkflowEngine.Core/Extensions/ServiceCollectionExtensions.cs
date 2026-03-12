using Microsoft.Extensions.Options;
using WorkflowEngine.Core.Constants;
using WorkflowEngine.Data.Extensions;
using WorkflowEngine.Models;
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
                return new ConcurrencyLimiter(settings.MaxConcurrentDbOperations, settings.MaxConcurrentHttpCalls);
            });

            // Command plugin system
            services.AddSingleton<ICommandRegistry>(sp =>
            {
                var commands = sp.GetServices<ICommand>();
                return new CommandRegistry(commands);
            });

            services.AddSingleton<IEngine, Engine>();
            services.AddSingleton<IWorkflowExecutor, WorkflowExecutor>();

            services.AddSingleton<AsyncSignal>();

            services.AddOptions<WorkflowWriteBufferOptions>().BindConfiguration("WorkflowWriteBuffer");
            services.AddSingleton<WorkflowWriteBuffer>();
            services.AddHostedService(sp => sp.GetRequiredService<WorkflowWriteBuffer>());

            services.AddOptions<StatusWriteBufferOptions>().BindConfiguration("StatusWriteBuffer");
            services.AddSingleton<StatusWriteBuffer>();
            services.AddHostedService(sp => sp.GetRequiredService<StatusWriteBuffer>());

            services.AddOptions<WorkflowProcessorOptions>().BindConfiguration("WorkflowProcessor");
            services.AddHostedService<WorkflowProcessor>();

            services.AddScoped<WorkflowHandler>();

            services.AddSingleton<EngineStatusProvider>();
            services.AddSingleton<IEngineStatus>(sp => sp.GetRequiredService<EngineStatusProvider>());

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

                if (config.MaxWorkflowsPerRequest <= 0)
                    config.MaxWorkflowsPerRequest = Defaults.EngineSettings.MaxWorkflowsPerRequest;

                if (config.MaxStepsPerWorkflow <= 0)
                    config.MaxStepsPerWorkflow = Defaults.EngineSettings.MaxStepsPerWorkflow;

                if (config.MaxLabels <= 0)
                    config.MaxLabels = Defaults.EngineSettings.MaxLabels;
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

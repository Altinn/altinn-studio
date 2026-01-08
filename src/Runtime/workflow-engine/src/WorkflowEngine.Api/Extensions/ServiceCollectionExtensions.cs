using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using WorkflowEngine.Api.Authentication;
using WorkflowEngine.Api.Constants;
using WorkflowEngine.Models;

namespace WorkflowEngine.Api.Extensions;

internal static class ServiceCollectionExtensions
{
    extension(IServiceCollection services)
    {
        /// <summary>
        /// Adds the workflow engine host and required services.
        /// </summary>
        public IServiceCollection AddWorkflowEngineHost()
        {
            if (!services.IsConfigured<WorkflowEngineSettings>())
                services.ConfigureWorkflowEngine("WorkflowEngineSettings");

            services.AddSingleton<IProcessEngine, ProcessEngine>();
            services.AddSingleton<IProcessEngineTaskHandler, ProcessEngineTaskHandler>();
            services.AddHostedService<ProcessEngineHost>();

            return services;
        }

        /// <summary>
        /// Configures the process engine settings by binding to a configuration section.
        /// </summary>
        public IServiceCollection ConfigureWorkflowEngine(string configSectionPath)
        {
            services
                .AddOptions<WorkflowEngineSettings>()
                .BindConfiguration(configSectionPath)
                .PostConfigure(SetProcessEngineSettingsDefaults)
                .Validate(ValidateProcessEngineSettings);

            return services;
        }

        /// <summary>
        /// Configures the process engine settings using a delegate.
        /// </summary>
        public IServiceCollection ConfigureWorkflowEngine(Action<WorkflowEngineSettings> configureOptions)
        {
            services
                .AddOptions<WorkflowEngineSettings>()
                .Configure(configureOptions)
                .PostConfigure(SetProcessEngineSettingsDefaults)
                .Validate(ValidateProcessEngineSettings);
            return services;
        }

        /// <summary>
        /// Adds API Key authentication and sets this as the default authentication mechanism for all endpoints
        /// </summary>
        public IServiceCollection AddApiKeyAuthentication()
        {
            services
                .AddAuthentication()
                .AddScheme<AuthenticationSchemeOptions, ApiKeyAuthenticationHandler>(
                    ApiKeyAuthenticationHandler.SchemeName,
                    null
                );
            services
                .AddAuthorizationBuilder()
                .AddDefaultPolicy(
                    "ApiKeyPolicy",
                    policy =>
                    {
                        policy.AddAuthenticationSchemes(ApiKeyAuthenticationHandler.SchemeName);
                        policy.RequireAuthenticatedUser();
                    }
                );

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

        /// <summary>
        /// Ensures that all <see cref="WorkflowEngineSettings"/> properties fall back to <see cref="Defaults"/> if not provided
        /// </summary>
        private static void SetProcessEngineSettingsDefaults(WorkflowEngineSettings config)
        {
            // Note: Don't offer to set API key or connection string defaults here, it should always be explicitly set in the config.

            if (config.QueueCapacity <= 0)
                config.QueueCapacity = Defaults.WorkflowEngineSettings.QueueCapacity;

            if (config.DefaultTaskExecutionTimeout <= TimeSpan.Zero)
                config.DefaultTaskExecutionTimeout = Defaults.WorkflowEngineSettings.DefaultTaskExecutionTimeout;

            config.DefaultTaskRetryStrategy ??= Defaults.WorkflowEngineSettings.DefaultTaskRetryStrategy;
            config.DefaultTaskRetryStrategy ??= Defaults.WorkflowEngineSettings.DefaultTaskRetryStrategy;
            config.DatabaseRetryStrategy ??= Defaults.WorkflowEngineSettings.DatabaseRetryStrategy;
            config.AppCommandEndpoint ??= Defaults.WorkflowEngineSettings.AppCommandEndpoint;
        }

        /// <summary>
        /// Ensures that all <see cref="WorkflowEngineSettings"/> properties fall back to <see cref="Defaults"/> if not provided
        /// </summary>
        private static bool ValidateProcessEngineSettings(WorkflowEngineSettings config)
        {
            if (string.IsNullOrEmpty(config.DatabaseConnectionString))
                return false;

            if (string.IsNullOrEmpty(config.ApiKey))
                return false;

            if (config.QueueCapacity <= 0)
                return false;

            if (config.DefaultTaskExecutionTimeout <= TimeSpan.Zero)
                return false;

            bool validAppCommandUri = Uri.TryCreate(config.AppCommandEndpoint, UriKind.Absolute, out _);
            if (!validAppCommandUri)
                return false;

            return true;
        }
    }
}

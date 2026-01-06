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
                .PostConfigure(SetProcessEngineSettingsDefaults);

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
                .PostConfigure(SetProcessEngineSettingsDefaults);
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
            config.ApiKey ??= Defaults.WorkflowEngineSettings.ApiKey;
            config.QueueCapacity ??= Defaults.WorkflowEngineSettings.QueueCapacity;
            config.DefaultTaskExecutionTimeout ??= Defaults.WorkflowEngineSettings.DefaultTaskExecutionTimeout;
            config.DefaultTaskRetryStrategy ??= Defaults.WorkflowEngineSettings.DefaultTaskRetryStrategy;
            config.DatabaseRetryStrategy ??= Defaults.WorkflowEngineSettings.DatabaseRetryStrategy;
            config.AppCommandEndpoint ??= Defaults.WorkflowEngineSettings.AppCommandEndpoint;
        }
    }
}

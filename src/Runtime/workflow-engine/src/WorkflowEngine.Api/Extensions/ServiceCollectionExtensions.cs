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

            services.AddSingleton<IEngine, Engine>();
            services.AddSingleton<IWorkflowExecutor, WorkflowExecutor>();
            services.AddHostedService<EngineHost>();

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
                .PostConfigure(SetEngineSettingsDefaults)
                .Validate(ValidateEngineSettings);

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
                .PostConfigure(SetEngineSettingsDefaults)
                .Validate(ValidateEngineSettings);
            return services;
        }

        public IServiceCollection ConfigureApi(string configSectionPath)
        {
            services.AddOptions<ApiSettings>().BindConfiguration(configSectionPath).Validate(ValidateApiSettings);
            return services;
        }

        public IServiceCollection ConfigureApi(Action<ApiSettings> configureOptions)
        {
            services.AddOptions<ApiSettings>().Configure(configureOptions).Validate(ValidateApiSettings);
            return services;
        }

        public IServiceCollection ConfigureAppCommand(string configSectionPath)
        {
            services
                .AddOptions<AppCommandSettings>()
                .BindConfiguration(configSectionPath)
                .PostConfigure(SetAppCommandDefaults)
                .Validate(ValidateAppCommandSettings);

            return services;
        }

        public IServiceCollection ConfigureAppCommand(Action<AppCommandSettings> configureOptions)
        {
            services
                .AddOptions<AppCommandSettings>()
                .Configure(configureOptions)
                .PostConfigure(SetAppCommandDefaults)
                .Validate(ValidateAppCommandSettings);

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
        /// Ensures that all <see cref="EngineSettings"/> properties fall back to <see cref="Defaults"/> if not provided
        /// </summary>
        private static void SetEngineSettingsDefaults(EngineSettings config)
        {
            if (config.QueueCapacity <= 0)
                config.QueueCapacity = Defaults.EngineSettings.QueueCapacity;

            if (config.DefaultTaskExecutionTimeout <= TimeSpan.Zero)
                config.DefaultTaskExecutionTimeout = Defaults.EngineSettings.DefaultTaskExecutionTimeout;

            config.DefaultTaskRetryStrategy ??= Defaults.EngineSettings.DefaultTaskRetryStrategy;
            config.DefaultTaskRetryStrategy ??= Defaults.EngineSettings.DefaultTaskRetryStrategy;
            config.DatabaseRetryStrategy ??= Defaults.EngineSettings.DatabaseRetryStrategy;
        }

        /// <summary>
        /// Ensures that all <see cref="EngineSettings"/> properties fall back to <see cref="Defaults"/> if not provided
        /// </summary>
        private static bool ValidateEngineSettings(EngineSettings config)
        {
            if (config.QueueCapacity <= 0)
                return false;

            if (config.DefaultTaskExecutionTimeout <= TimeSpan.Zero)
                return false;

            return true;
        }

        private static void SetAppCommandDefaults(AppCommandSettings config)
        {
            // Note: Don't offer to set API key here, it should always be explicitly set in the config.
            config.CommandEndpoint ??= Defaults.AppCommandSettings.CommandEndpoint;
        }

        private static bool ValidateAppCommandSettings(AppCommandSettings config)
        {
            if (string.IsNullOrEmpty(config.ApiKey))
                return false;

            bool validAppCommandUri = Uri.TryCreate(config.CommandEndpoint, UriKind.Absolute, out _);
            if (!validAppCommandUri)
                return false;

            return true;
        }

        private static bool ValidateApiSettings(ApiSettings config)
        {
            if (!config.ApiKeys.Any())
                return false;

            // Require API keys to be of somewhat reasonable length. Preferably GUIDs, but not strictly enforced.
            if (config.ApiKeys.Any(x => string.IsNullOrEmpty(x) || x.Length < 15))
                return false;

            return true;
        }
    }
}

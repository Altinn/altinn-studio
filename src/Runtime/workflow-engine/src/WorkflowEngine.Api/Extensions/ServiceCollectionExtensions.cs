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

            services.AddHttpClient();
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
                    ApiKeyAuthenticationHandler.PolicyName,
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

                if (config.DefaultCommandExecutionTimeout <= TimeSpan.Zero)
                    config.DefaultCommandExecutionTimeout = Defaults.EngineSettings.DefaultCommandExecutionTimeout;

                config.DefaultStepRetryStrategy ??= Defaults.EngineSettings.DefaultStepRetryStrategy;
                config.DefaultStepRetryStrategy ??= Defaults.EngineSettings.DefaultStepRetryStrategy;
                config.DatabaseRetryStrategy ??= Defaults.EngineSettings.DatabaseRetryStrategy;
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
                config => config.DefaultCommandExecutionTimeout > TimeSpan.Zero,
                $"{ns}.{nameof(EngineSettings.DefaultCommandExecutionTimeout)} must be greater than zero."
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

using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using WorkflowEngine.App.Commands.AppCommand;
using WorkflowEngine.App.Constants;

namespace WorkflowEngine.App.Extensions;

public static class ServiceCollectionExtensions
{
    extension(IServiceCollection services)
    {
        public IServiceCollection ConfigureAppCommand(
            string configSectionPath = "AppCommandSettings"
        )
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
    }
}

public static class AppCommandOptionsBuilderExtensions
{
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
            builder.PostConfigure(config =>
            {
                config.CommandEndpoint ??= Defaults.AppCommandSettings.CommandEndpoint;
            });

            return builder;
        }
    }
}

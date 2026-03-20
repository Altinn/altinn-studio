using Microsoft.Extensions.Options;
using WorkflowEngine.App.Commands.AppCommand;

namespace WorkflowEngine.App.Extensions;

internal static class ServiceCollectionExtensions
{
    extension(IServiceCollection services)
    {
        public IServiceCollection ConfigureAppCommand(string configSectionPath = "AppCommandSettings")
        {
            services.AddOptions<AppCommandSettings>().BindConfiguration(configSectionPath).ValidateAppCommandSettings();

            return services;
        }

        public IServiceCollection ConfigureAppCommand(Action<AppCommandSettings> configureOptions)
        {
            services.AddOptions<AppCommandSettings>().Configure(configureOptions).ValidateAppCommandSettings();

            return services;
        }
    }
}

internal static class AppCommandOptionsBuilderExtensions
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

            return builder;
        }
    }
}

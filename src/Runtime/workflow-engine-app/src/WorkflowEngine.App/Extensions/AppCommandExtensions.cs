using Microsoft.Extensions.Options;
using WorkflowEngine.App.Commands.AppCommand;
using WorkflowEngine.App.Constants;
using WorkflowEngine.Commands.Extensions;

// CA1305: Specify IFormatProvider
#pragma warning disable CA1305

namespace WorkflowEngine.App.Extensions;

internal static class ServiceCollectionExtensions
{
    extension(IServiceCollection services)
    {
        public IServiceCollection ConfigureAppCommand(string configSectionPath = "AppCommandSettings")
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

internal static class AppCommandOptionsBuilderExtensions
{
    extension(OptionsBuilder<AppCommandSettings> builder)
    {
        public OptionsBuilder<AppCommandSettings> ValidateAppCommandSettings()
        {
            const string ns = nameof(AppCommandSettings);
            AppWorkflowContext dummyContext = new()
            {
                Actor = new Actor { UserIdOrOrgNumber = "501337" },
                App = "app",
                Org = "org",
                InstanceOwnerPartyId = 12345,
                InstanceGuid = Guid.NewGuid(),
                LockToken = "asdf",
            };

            builder.Validate(
                config => Uri.TryCreate(config.CommandEndpoint.FormatWith(dummyContext), UriKind.Absolute, out _),
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

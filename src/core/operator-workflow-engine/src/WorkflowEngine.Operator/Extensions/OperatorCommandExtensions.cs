using WorkflowEngine.Operator.Commands.OperatorCommand;

namespace WorkflowEngine.Operator.Extensions;

internal static class ServiceCollectionExtensions
{
    extension(IServiceCollection services)
    {
        /// <summary>
        /// Binds <see cref="OperatorCommandSettings"/> from the configuration section of that name, and checks it at
        /// startup.
        /// </summary>
        public IServiceCollection ConfigureOperatorCommand()
        {
            const string ns = nameof(OperatorCommandSettings);

            services
                .AddOptions<OperatorCommandSettings>()
                .BindConfiguration(ns)
                .Validate(
                    config =>
                        Uri.TryCreate(config.CommandEndpoint, UriKind.Absolute, out var uri)
                        && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps),
                    $"{ns}.{nameof(OperatorCommandSettings.CommandEndpoint)} must be an absolute http or https URL."
                )
                .ValidateOnStart();

            return services;
        }
    }
}

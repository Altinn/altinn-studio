using WorkflowEngine.Operator.Commands.OperatorCommand;

namespace WorkflowEngine.Operator.Extensions;

internal static class ServiceCollectionExtensions
{
    extension(IServiceCollection services)
    {
        /// <summary>Binds <see cref="OperatorCommandSettings"/>, and fails the start when its endpoint is not a URL.</summary>
        public IServiceCollection ConfigureOperatorCommand()
        {
            const string sectionName = nameof(OperatorCommandSettings);

            services
                .AddOptions<OperatorCommandSettings>()
                .BindConfiguration(sectionName)
                .Validate(
                    config =>
                        Uri.TryCreate(config.CommandEndpoint, UriKind.Absolute, out var uri)
                        && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps),
                    $"{sectionName}.{nameof(OperatorCommandSettings.CommandEndpoint)} must be an absolute http or https URL."
                )
                .ValidateOnStart();

            return services;
        }
    }
}

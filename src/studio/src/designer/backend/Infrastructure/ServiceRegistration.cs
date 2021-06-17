using Altinn.Common.AccessTokenClient.Services;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.Studio.Designer.Infrastructure
{
    /// <summary>
    /// Contains extension methods for registering services to the DI container
    /// </summary>
    public static class ServiceRegistration
    {
        /// <summary>
        /// Extension method that registers services to the DI container
        /// </summary>
        /// <param name="services">The Microsoft.Extensions.DependencyInjection.IServiceCollection for adding services.</param>
        /// <param name="configuration">The configuration for the project</param>
        public static IServiceCollection RegisterServiceImplementations(this IServiceCollection services, IConfiguration configuration)
        {
            services.AddTransient<IRepository, RepositorySI>();
            services.AddTransient<ISchemaModelService, SchemaModelService>();
            services.AddTransient<ISourceControl, SourceControlSI>();

            services.AddTransient<IDefaultFileFactory, DefaultFileFactory>();
            services.AddSingleton(configuration);

            services.AddTransient<IReleaseService, ReleaseService>();
            services.AddTransient<IDeploymentService, DeploymentService>();
            services.AddTransient<IApplicationInformationService, ApplicationInformationService>();
            services.AddTransient<IApplicationMetadataService, ApplicationMetadataService>();
            services.AddTransient<IAuthorizationPolicyService, AuthorizationPolicyService>();
            services.AddTransient<IPipelineService, PipelineService>();
            services.AddTransient<ITextResourceService, TextResourceService>();
            services.AddTransient<IAccessTokenGenerator, AccessTokenGenerator>();
            services.AddTransient<ISigningCredentialsResolver, SigningCredentialsResolver>();

            return services;
        }
    }
}

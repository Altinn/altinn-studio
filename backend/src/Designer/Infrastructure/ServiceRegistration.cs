using Altinn.Common.AccessTokenClient.Services;
using Altinn.Studio.DataModeling.Converter.Csharp;
using Altinn.Studio.DataModeling.Converter.Interfaces;
using Altinn.Studio.DataModeling.Converter.Json;
using Altinn.Studio.DataModeling.Converter.Xml;
using Altinn.Studio.DataModeling.Json;
using Altinn.Studio.DataModeling.Validator.Json;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Configuration.Extensions;
using Altinn.Studio.Designer.Factories;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.ORMImplementation;
using Altinn.Studio.Designer.Repository.ORMImplementation.Data;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Implementation.ProcessModeling;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.ImageClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;
using static Altinn.Studio.DataModeling.Json.Keywords.JsonSchemaKeywords;

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
            services.AddTransient<IAltinnGitRepositoryFactory, AltinnGitRepositoryFactory>();

            services.AddTransient<ISourceControl, SourceControlSI>();
            services.Decorate<ISourceControl, SourceControlLoggingDecorator>();

            services.AddSingleton(configuration);

            services.AddDbContext<DesignerdbContext>(options =>
            {
                PostgreSQLSettings postgresSettings = configuration.GetSection(nameof(PostgreSQLSettings)).Get<PostgreSQLSettings>();
                string connectionString = string.Format(
                    postgresSettings.ConnectionString,
                    postgresSettings.DesignerDbPwd);
                options.UseNpgsql(connectionString);
            });

            services.AddScoped<IReleaseRepository, ORMReleaseRepository>();
            services.AddScoped<IDeploymentRepository, ORMDeploymentRepository>();
            services.AddTransient<IReleaseService, ReleaseService>();
            services.AddTransient<IDeploymentService, DeploymentService>();
            services.AddTransient<IKubernetesDeploymentsService, KubernetesDeploymentsService>();
            services.AddTransient<IApplicationInformationService, ApplicationInformationService>();
            services.AddTransient<IApplicationMetadataService, ApplicationMetadataService>();
            services.AddTransient<IAuthorizationPolicyService, AuthorizationPolicyService>();
            services.AddTransient<ITextResourceService, TextResourceService>();
            services.AddTransient<IAccessTokenGenerator, AccessTokenGenerator>();
            services.AddTransient<ISigningCredentialsResolver, SigningCredentialsResolver>();
            services.AddTransient<ILanguagesService, LanguagesService>();
            services.AddTransient<ITextsService, TextsService>();
            services.AddTransient<IOptionsService, OptionsService>();
            services.AddTransient<IEnvironmentsService, EnvironmentsService>();
            services.AddHttpClient<IOrgService, OrgService>();
            services.AddHttpClient<ImageClient>();
            services.AddTransient<IAppDevelopmentService, AppDevelopmentService>();
            services.AddTransient<IPreviewService, PreviewService>();
            services.AddTransient<IResourceRegistry, ResourceRegistryService>();
            services.AddTransient<IProcessModelingService, ProcessModelingService>();
            services.AddTransient<IImagesService, ImagesService>();
            services.RegisterDatamodeling(configuration);
            services.RegisterUserRequestSynchronization(configuration);

            return services;
        }

        public static IServiceCollection RegisterDatamodeling(this IServiceCollection services, IConfiguration configuration)
        {
            services.AddTransient<IXmlSchemaToJsonSchemaConverter, XmlSchemaToJsonSchemaConverter>();
            services.AddTransient<IJsonSchemaToXmlSchemaConverter, JsonSchemaToXmlSchemaConverter>();
            services.AddTransient<IJsonSchemaNormalizer, JsonSchemaNormalizer>();
            services.AddTransient<IModelMetadataToCsharpConverter, JsonMetadataToCsharpConverter>();
            services.RegisterSettings<CSharpGenerationSettings>(configuration);
            services.AddTransient<IJsonSchemaValidator, AltinnJsonSchemaValidator>();
            services.AddTransient<IModelNameValidator, ModelNameValidator>();
            RegisterXsdKeywords();
            return services;
        }

        public static IServiceCollection RegisterUserRequestSynchronization(this IServiceCollection services, IConfiguration configuration)
        {
            services.Configure<UserRequestSynchronizationSettings>(configuration.GetSection(nameof(UserRequestSynchronizationSettings)));
            services.TryAddSingleton(typeof(UserRequestSynchronizationSettings), svc => ((IOptions<object>)svc.GetService(typeof(IOptions<UserRequestSynchronizationSettings>)))!.Value);
            services.TryAddSingleton<IUserRequestsSynchronizationService, UserRequestsSynchronizationService>();
            return services;
        }
    }
}

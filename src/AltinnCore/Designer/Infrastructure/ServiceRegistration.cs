using AltinnCore.Common.Backend;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Services.Implementation;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.Designer.Services;
using AltinnCore.Designer.Services.Interfaces;
using AltinnCore.ServiceLibrary.Services.Interfaces;
using Microsoft.AspNetCore.Mvc.Razor.Compilation;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AltinnCore.Designer.Infrastructure
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
            // Adding services to Dependency Injection TODO: Make this environment specific
            services.AddSingleton<IDSF, RegisterDSFStudioSI>();
            services.AddSingleton<IER, RegisterERStudioSI>();
            services.AddSingleton<IRegister, RegisterStudioSI>();
            services.AddSingleton<IProfile, ProfileStudioSI>();

            // services.AddSingleton<ICompilation, CompilationSI>();
            // services.AddSingleton<IForm, FormStudioSI>();
            services.AddTransient<IRepository, RepositorySI>();
            services.AddSingleton<IServicePackageRepository, RepositorySI>();
            services.AddTransient<ISourceControl, SourceControlSI>();

            services.AddSingleton<IViewCompiler, CustomRoslynCompilationService>();
            services.AddTransient<IDefaultFileFactory, DefaultFileFactory>();
            services.AddSingleton(configuration);

            services.AddTransient<IReleaseService, ReleaseService>();
            services.AddTransient<IDeploymentService, DeploymentService>();
            services.AddTransient<IApplicationInformationService, ApplicationInformationService>();
            services.AddTransient<IApplicationMetadataService, ApplicationMetadataService>();
            services.AddTransient<IAuthorizationPolicyService, AuthorizationPolicyService>();
            services.AddTransient<IPipelineService, PipelineService>();

            return services;
        }
    }
}

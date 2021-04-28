namespace Altinn.Platform.Storage.Repository
{
    using Microsoft.Extensions.DependencyInjection;
    using Microsoft.Extensions.Hosting;

    /// <summary>
    /// Add repositories to DI.
    /// </summary>
    public static class ServiceCollectionExtensions
    {
        /// <summary>
        /// Adds repositories to DI container.
        /// </summary>
        /// <param name="services">service collection.</param>
        /// <returns></returns>
        public static IServiceCollection AddRepositories(this IServiceCollection services)
        {
            return services
                .AddRepository<IDataRepository, DataRepository>()
                .AddRepository<IInstanceRepository, InstanceRepository>()
                .AddRepository<IApplicationRepository, ApplicationRepository>()
                .AddRepository<IInstanceEventRepository, InstanceEventRepository>()
                .AddRepository<ITextRepository, TextRepository>();
        }

        private static IServiceCollection AddRepository<TIRepo, TRepo>(this IServiceCollection services)
            where TIRepo : class
            where TRepo : class, IHostedService, TIRepo
        {
            return services
                .AddSingleton<TIRepo, TRepo>()
                .AddHostedService(sp => (TRepo)sp.GetRequiredService<TIRepo>());
        }
    }
}

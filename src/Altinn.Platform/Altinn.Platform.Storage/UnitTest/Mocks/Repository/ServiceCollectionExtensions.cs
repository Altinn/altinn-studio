namespace Altinn.Platform.Storage.UnitTest.Mocks.Repository
{
    using Altinn.Platform.Storage.Repository;
    using Microsoft.Extensions.DependencyInjection;

    public static class ServiceCollectionExtensions
    {
        public static IServiceCollection AddMockRepositories(this IServiceCollection services)
        {
            return services
                .AddSingleton<IDataRepository, DataRepositoryMock>()
                .AddSingleton<IInstanceRepository, InstanceRepositoryMock>()
                .AddSingleton<IApplicationRepository, ApplicationRepositoryMock>()
                .AddSingleton<IInstanceEventRepository, InstanceEventRepositoryMock>()
                .AddSingleton<ITextRepository, TextRepositoryMock>();
        }
    }
}

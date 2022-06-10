using Altinn.Platform.Storage.Repository;

using Microsoft.Extensions.DependencyInjection;

namespace Altinn.Platform.Storage.UnitTest.Mocks.Repository
{
    public static class ServiceCollectionExtensions
    {
        public static void AddMockRepositories(this IServiceCollection services)
        {
            services.AddSingleton<IDataRepository, DataRepositoryMock>();
            services.AddSingleton<IInstanceRepository, InstanceRepositoryMock>();
            services.AddSingleton<IApplicationRepository, ApplicationRepositoryMock>();
            services.AddSingleton<IInstanceEventRepository, InstanceEventRepositoryMock>();
            services.AddSingleton<ITextRepository, TextRepositoryMock>();
        }
    }
}

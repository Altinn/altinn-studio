using System.Net.Http;

using Altinn.Platform.Storage.Controllers;
using Altinn.Platform.Storage.Repository;

using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;

using Moq;
using Xunit;

namespace Altinn.Platform.Storage.IntegrationTest.TestingControllers
{
    /// <summary>
    /// Represents a collection of integration tests of the <see cref="DataController"/>.
    /// </summary>
    public class DataControllerTests : IClassFixture<WebApplicationFactory<Startup>>
    {
        private const string BasePath = "/storage/api/v1";

        private readonly WebApplicationFactory<Startup> _factory;

        /// <summary>
        /// Initializes a new instance of the <see cref="DataControllerTests"/> class with the given <see cref="WebApplicationFactory{TEntryPoint}"/>.
        /// </summary>
        /// <param name="factory">The <see cref="WebApplicationFactory{TEntryPoint}"/> to use when setting up the test server.</param>
        public DataControllerTests(WebApplicationFactory<Startup> factory)
        {
            _factory = factory;
        }

        private HttpClient GetTestClient()
        {
            // No setup required for these services. They are not in use by the ApplicationController
            Mock<IApplicationRepository> applicationRepository = new Mock<IApplicationRepository>();
            Mock<IDataRepository> dataRepository = new Mock<IDataRepository>();
            Mock<IInstanceRepository> instanceRepository = new Mock<IInstanceRepository>();
            Mock<IInstanceEventRepository> instanceEventRepository = new Mock<IInstanceEventRepository>();

            HttpClient client = _factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureTestServices(services =>
                {
                    services.AddSingleton(applicationRepository);
                    services.AddSingleton(dataRepository);
                    services.AddSingleton(instanceRepository);
                    services.AddSingleton(instanceEventRepository);
                });
            }).CreateClient();

            return client;
        }
    }
}

using System.Linq;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Controllers;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Fixtures;
using Designer.Tests.Mocks;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Designer.Tests.Controllers
{
    [Collection(nameof(GiteaCollection))]
    public class GiteaIntegrationTests : ApiTestsBase<UserController, GiteaIntegrationTests>
    {
        private readonly string _versionPrefix = "designer/api/user";
        private GiteaFixture _giteaFixture;

        public GiteaIntegrationTests(GiteaFixture giteaFixture, WebApplicationFactory<UserController> factory) : base(factory)
        {
            _giteaFixture = giteaFixture;
        }

        protected override void ConfigureTestServices(IServiceCollection services)
        {
            services.Configure<ServiceRepositorySettings>(c =>
                c.RepositoryLocation = TestRepositoriesLocation);
            services.AddSingleton<IGitea, IGiteaMock>();
        }

        [Fact]
        public async Task GetCurrentUser_ShouldReturnOk()
        {
            string requestUrl = $"{_versionPrefix}/current";
            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, requestUrl);

            using HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            response.Headers.First(h => h.Key == "Set-Cookie").Value.Should().Satisfy(e => e.Contains("XSRF-TOKEN"));
        }
    }
}

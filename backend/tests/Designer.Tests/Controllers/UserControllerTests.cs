using System.Linq;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Controllers;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Mocks;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Designer.Tests.Controllers
{
    public class UserControllerTests : ApiTestsBase<UserController, UserControllerTests>
    {
        public UserControllerTests(WebApplicationFactory<UserController> webApplicationFactory) : base(webApplicationFactory)
        {
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
            string requestUrl = "/designer/api/v1/user/current";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, requestUrl);

            HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            response.Headers.First(h => h.Key == "Set-Cookie").Value.Should().Satisfy(e => e.Contains("XSRF-TOKEN"));
        }

        [Fact]
        public async Task GetUserStarredRepositories_ShouldReturnOk()
        {
            string requestUrl = "/designer/api/v1/user/starred";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, requestUrl);

            HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);

            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task PutUserStarredRepositories_ShouldReturnNoContent()
        {
            string requestUrl = "/designer/api/v1/user/starred/tdd/reponametostar";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, requestUrl);

            HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);

            response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        }

        [Fact]
        public async Task DeleteUserStarredRepositories_ShouldReturnNoContent()
        {
            string requestUrl = "/designer/api/v1/user/starred/tdd/reponametounstar";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Delete, requestUrl);

            HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);

            response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        }
    }
}

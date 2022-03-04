using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Altinn.Studio.Designer;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Mocks;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers
{
    public class UserControllerTests : IClassFixture<WebApplicationFactory<Startup>>
    {
        private readonly WebApplicationFactory<Startup> _factory;

        public UserControllerTests(WebApplicationFactory<Startup> webApplicationFactory)
        {
            _factory = webApplicationFactory;
        }

        [Fact]
        public async Task GetCurrentUser_ShouldReturnOk()
        {
            var client = GetTestClient();

            string requestUrl = "/designer/api/v1/user/current";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, requestUrl);
            await AuthenticationUtil.AddAuthenticateAndAuthAndXsrFCookieToRequest(client, httpRequestMessage);

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
            response.Headers.First(h => h.Key == "Set-Cookie").Value.Should().Satisfy(e => e.Contains("XSRF-TOKEN"));
        }

        [Fact]
        public async Task GetUserStarredRepositories_ShouldReturnOk()
        {
            var client = GetTestClient();

            string requestUrl = "/designer/api/v1/user/starred";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, requestUrl);
            await AuthenticationUtil.AddAuthenticateAndAuthAndXsrFCookieToRequest(client, httpRequestMessage);

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task PutUserStarredRepositories_ShouldReturnNoContent()
        {
            var client = GetTestClient();

            string requestUrl = "/designer/api/v1/user/starred/tdd/reponametostar";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, requestUrl);
            await AuthenticationUtil.AddAuthenticateAndAuthAndXsrFCookieToRequest(client, httpRequestMessage);

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        }

        [Fact]
        public async Task DeleteUserStarredRepositories_ShouldReturnNoContent()
        {
            var client = GetTestClient();

            string requestUrl = "/designer/api/v1/user/starred/tdd/reponametounstar";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Delete, requestUrl);
            await AuthenticationUtil.AddAuthenticateAndAuthAndXsrFCookieToRequest(client, httpRequestMessage);

            HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

            response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        }

        private HttpClient GetTestClient()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(DatamodelsControllerTests).Assembly.Location).LocalPath);

            Program.ConfigureSetupLogging();

            HttpClient client = _factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureAppConfiguration((context, conf) =>
                {
                    conf.AddJsonFile("appsettings.json");
                });

                var configuration = new ConfigurationBuilder()
                    .AddJsonFile("appsettings.json")
                    .Build();

                configuration.GetSection("ServiceRepositorySettings:RepositoryLocation").Value = Path.Combine(unitTestFolder, @"..\..\..\_TestData\Repositories\");

                IConfigurationSection serviceRepositorySettingSection = configuration.GetSection("ServiceRepositorySettings");

                Mock<IRepository> repositoryMock = new Mock<IRepository>() { CallBase = true, };
                
                builder.ConfigureTestServices(services =>
                {
                    services.Configure<ServiceRepositorySettings>(serviceRepositorySettingSection);

                    services.AddSingleton<IGitea, IGiteaMock>();
                    services.AddSingleton(repositoryMock.Object);
                });
            }).CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
            return client;
        }
    }
}

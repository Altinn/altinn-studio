using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;

using Altinn.Common.PEP.Interfaces;

using Altinn.Platform.Storage.Clients;
using Altinn.Platform.Storage.Controllers;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;
using Altinn.Platform.Storage.UnitTest.Mocks;
using Altinn.Platform.Storage.UnitTest.Mocks.Authentication;
using Altinn.Platform.Storage.UnitTest.Mocks.Repository;
using Altinn.Platform.Storage.UnitTest.Utils;
using Altinn.Platform.Storage.Wrappers;

using AltinnCore.Authentication.JwtCookie;

using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

using Moq;
using Xunit;

namespace Altinn.Platform.Storage.IntegrationTest.TestingControllers
{
    /// <summary>
    /// Represents a collection of integration tests of the <see cref="DataController"/>.
    /// </summary>
    public class DataControllerTests : IClassFixture<WebApplicationFactory<Startup>>
    {
        private readonly WebApplicationFactory<Startup> _factory;
        private readonly string _versionPrefix = "/storage/api/v1";

        /// <summary>
        /// Initializes a new instance of the <see cref="DataControllerTests"/> class.
        /// </summary>
        /// <param name="fixture">Platform storage fixture.</param>
        public DataControllerTests(WebApplicationFactory<Startup> factory)
        {
            _factory = factory;

        }

        /// <summary>
        /// Scenario:
        ///   Add data element to created instances.
        /// Expected:
        ///   Request is authorized
        /// Success:
        /// Created 
        /// </summary>
        [Fact]
        public async void Post_NewData_Ok()
        {
            TestDataUtil.DeleteInstanceAndDataAndBlobs(1337, "bc19107c-508f-48d9-bcd7-54ffec905306", "tdd", "endring-av-navn");
            TestDataUtil.PrepareInstance(1337, "bc19107c-508f-48d9-bcd7-54ffec905306");
            string dataPathWithData = $"{_versionPrefix}/instances/1337/bc19107c-508f-48d9-bcd7-54ffec905306/data";
            HttpContent content = new StringContent("This is a blob file");

            HttpClient client = GetTestClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetToken(3, 1337, 3));
            HttpResponseMessage response = await client.PostAsync($"{dataPathWithData}?dataType=default", content);

            if (response.StatusCode.Equals(HttpStatusCode.InternalServerError))
            {
                string serverContent = await response.Content.ReadAsStringAsync();
                Assert.Equal("Hei", serverContent);
            }

            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            TestDataUtil.DeleteInstanceAndDataAndBlobs(1337, "bc19107c-508f-48d9-bcd7-54ffec905306", "tdd", "endring-av-navn");
        }


        /// <summary>
        /// Scenario:
        ///   Add data element to created instances. Authenticated users is not authorized to perform this operation.
        /// Expected:
        ///   Request is authorized
        /// Success:
        /// Created 
        /// </summary>
        [Fact]
        public async void Post_NewData_NotAuthorized()
        {
            string dataPathWithData = $"{_versionPrefix}/instances/1337/69c259d1-9c1f-4ab6-9d8b-5c210042dc4f/data";
            HttpContent content = new StringContent("This is a blob file");

            HttpClient client = GetTestClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetToken(1, 1337, 3));
            HttpResponseMessage response = await client.PostAsync($"{dataPathWithData}?dataType=default", content);

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }



        /// <summary>
        /// Scenario:
        ///   Add data element to created instances. Authenticated users is not authorized to perform this operation.
        /// Expected:
        ///   Request is authorized
        /// Success:
        /// Created 
        /// </summary>
        [Fact]
        public async void Post_NewData_ToLowAuthenticationLevel()
        {
            string dataPathWithData = $"{_versionPrefix}/instances/1337/69c259d1-9c1f-4ab6-9d8b-5c210042dc4f/data";
            HttpContent content = new StringContent("This is a blob file");

            HttpClient client = GetTestClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetToken(3, 1337, 0));
            HttpResponseMessage response = await client.PostAsync($"{dataPathWithData}?dataType=default", content);

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }


        /// <summary>
        /// Scenario:
        ///   Add data element to created instances.
        /// Expected:
        ///   Request is authorized
        /// Success:
        /// Created 
        /// </summary>
        [Fact]
        public async void Put_UpdateData_Ok()
        {
            TestDataUtil.DeleteInstanceAndDataAndBlobs(1337, "649388f0-a2c0-4774-bd11-c870223ed819", "tdd", "endring-av-navn");
            TestDataUtil.PrepareInstance(1337, new Guid("649388f0-a2c0-4774-bd11-c870223ed819"), "tdd", "endring-av-navn");
            string dataPathWithData = $"{_versionPrefix}/instances/1337/649388f0-a2c0-4774-bd11-c870223ed819/data/11f7c994-6681-47a1-9626-fcf6c27308a5";
            HttpContent content = new StringContent("This is a blob file with updated data");

            HttpClient client = GetTestClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetToken(3, 1337, 3));
            HttpResponseMessage response = await client.PutAsync($"{dataPathWithData}?dataType=default", content);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            TestDataUtil.DeleteInstanceAndDataAndBlobs(1337, "649388f0-a2c0-4774-bd11-c870223ed819", "tdd", "endring-av-navn");
        }


        private HttpClient GetTestClient()
        {
            Mock<IApplicationRepository> applicationRepository = new Mock<IApplicationRepository>();
            Application testApp1 = new Application() { Id = "test/testApp1", Org = "test" };

            applicationRepository.Setup(s => s.FindOne(It.Is<string>(p => p.Equals("test/testApp1")), It.IsAny<string>())).ReturnsAsync(testApp1);

            // No setup required for these services. They are not in use by the InstanceController
            Mock<ISasTokenProvider> sasTokenProvider = new Mock<ISasTokenProvider>();
            Mock<IKeyVaultClientWrapper> keyVaultWrapper = new Mock<IKeyVaultClientWrapper>();
            Mock<IPartiesWithInstancesClient> partiesWrapper = new Mock<IPartiesWithInstancesClient>();

            Program.ConfigureSetupLogging();
            HttpClient client = _factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureTestServices(services =>
                {
                    services.AddSingleton<IApplicationRepository, ApplicationRepositoryMock>();
                    services.AddSingleton<IDataRepository, DataRepositoryMock>();
                    services.AddSingleton<IInstanceEventRepository, InstanceEventRepositoryMock>();
                    services.AddSingleton<IInstanceRepository, InstanceRepositoryMock>();
                    services.AddSingleton(sasTokenProvider.Object);
                    services.AddSingleton(keyVaultWrapper.Object);
                    services.AddSingleton(partiesWrapper.Object);
                    services.AddSingleton<IPDP, PepWithPDPAuthorizationMockSI>();
                    services.AddSingleton<IPostConfigureOptions<JwtCookieOptions>, JwtCookiePostConfigureOptionsStub>();
                });
            }).CreateClient();

            return client;
        }

    }
}

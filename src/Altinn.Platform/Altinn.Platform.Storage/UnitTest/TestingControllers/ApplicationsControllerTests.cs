using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Reflection;
using System.Text;

using Altinn.Common.PEP.Interfaces;

using Altinn.Platform.Storage.Clients;
using Altinn.Platform.Storage.Controllers;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;
using Altinn.Platform.Storage.UnitTest.Fixture;
using Altinn.Platform.Storage.UnitTest.Mocks;
using Altinn.Platform.Storage.UnitTest.Mocks.Authentication;
using Altinn.Platform.Storage.UnitTest.Mocks.Repository;
using Altinn.Platform.Storage.UnitTest.Utils;
using Altinn.Platform.Storage.Wrappers;

using AltinnCore.Authentication.JwtCookie;

using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Azure.Documents;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

using Moq;

using Newtonsoft.Json;

using Xunit;

namespace Altinn.Platform.Storage.UnitTest.TestingControllers
{
    public class ApplicationsControllerTests : IClassFixture<TestApplicationFactory<Startup>>
    {
        private const string BasePath = "/storage/api/v1";

        private readonly TestApplicationFactory<Startup> _factory;

        /// <summary>
        /// Initializes a new instance of the <see cref="ApplicationsControllerTests"/> class with the given <see cref="WebApplicationFactory{TStartup}"/>.
        /// </summary>
        /// <param name="factory">The <see cref="TestApplicationFactory{TStartup}"/> to use when setting up the test server.</param>
        public ApplicationsControllerTests(TestApplicationFactory<Startup> factory)
        {
            _factory = factory;
        }

        /// <summary>
        /// Testing that the <see cref="ApplicationsController.IsValidAppId"/> operation successfully identifies valid and invalid app id values.
        /// </summary>
        [Fact]
        public void IsValidAppId_SuccessfullyIdentifiesValidAndInvalidAppIdValues()
        {
            ApplicationsController appController = new ApplicationsController(null, null);

            Assert.True(appController.IsValidAppId("test/a234"));
            Assert.True(appController.IsValidAppId("sp1/ab23"));
            Assert.True(appController.IsValidAppId("multipledash/a-b-234"));

            Assert.False(appController.IsValidAppId("2orgstartswithnumber/b234"));
            Assert.False(appController.IsValidAppId("UpperCaseOrg/x234"));
            Assert.False(appController.IsValidAppId("org-with-dash/x234"));
            Assert.False(appController.IsValidAppId("morethanoneslash/a2/34"));
            Assert.False(appController.IsValidAppId("test/UpperCaseApp"));
            Assert.False(appController.IsValidAppId("testonlynumbersinapp/42"));
        }

        /// <summary>
        /// Scenario:
        ///   Post a simple but valid Application instance.
        /// Expected result:
        ///   Returns HttpStatus Created and the Application instance.
        /// Success criteria:
        ///   The response has correct status and the returned application instance has been populated with a data type.
        /// </summary>
        [Fact]
        public async void Post_GivenValidApplication_ReturnsStatusCreatedAndCorrectData()
        {
            // Arrange
            string org = "test";
            string appName = "app20";
            string requestUri = $"{BasePath}/applications?appId={org}/{appName}";

            Application appInfo = CreateApplication(org, appName);

            DocumentClientException dex = CreateDocumentClientExceptionForTesting("Not found", HttpStatusCode.NotFound);

            Mock<IApplicationRepository> applicationRepository = new Mock<IApplicationRepository>();
            applicationRepository.Setup(s => s.FindOne(It.IsAny<string>(), It.IsAny<string>())).ThrowsAsync(dex);
            applicationRepository.Setup(s => s.Create(It.IsAny<Application>())).ReturnsAsync((Application app) => app);

            HttpClient client = GetTestClient(applicationRepository.Object);
            string token = PrincipalUtil.GetAccessToken("studio.designer");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            // Act
            HttpResponseMessage response = await client.PostAsync(requestUri, JsonContent.Create(appInfo, new MediaTypeHeaderValue("application/json")));

            // Assert
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);

            string content = response.Content.ReadAsStringAsync().Result;
            Application application = JsonConvert.DeserializeObject(content, typeof(Application)) as Application;

            Assert.NotNull(application);
            Assert.NotNull(application.DataTypes);
            Assert.Single(application.DataTypes);
            Assert.Equal("default", application.DataTypes[0].Id);
        }

        /// <summary>
        /// Scenario:
        ///   Post a simple, valid Application instance but client has incorrect scope.
        /// Expected result:
        ///   Returns HttpStatus Forbidden and no Application instance get returned.
        /// </summary>
        [Fact]
        public async void Post_ClientWithIncorrectScope_ReturnsStatusForbidden()
        {
            // Arrange
            string org = "test";
            string appName = "app20";
            string requestUri = $"{BasePath}/applications?appId={org}/{appName}";

            Application appInfo = CreateApplication(org, appName);

            DocumentClientException dex = CreateDocumentClientExceptionForTesting("Not found", HttpStatusCode.NotFound);

            Mock<IApplicationRepository> applicationRepository = new Mock<IApplicationRepository>();
            applicationRepository.Setup(s => s.FindOne(It.IsAny<string>(), It.IsAny<string>())).ThrowsAsync(dex);
            applicationRepository.Setup(s => s.Create(It.IsAny<Application>())).ReturnsAsync((Application app) => app);

            HttpClient client = GetTestClient(applicationRepository.Object);
            string token = PrincipalUtil.GetOrgToken(org: "testOrg", scope: "altinn:invalidScope");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            // Act
            HttpResponseMessage response = await client.PostAsync(requestUri, JsonContent.Create(appInfo, new MediaTypeHeaderValue("application/json")));

            // Assert
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            string content = response.Content.ReadAsStringAsync().Result;
            Assert.True(string.IsNullOrEmpty(content));
        }

        /// <summary>
        /// Scenario:
        ///   Post a simple but valid Application instance but scope claim is empty.
        /// Expected result:
        ///   Returns HttpStatus Forbidden and no Application instance get returned.
        /// </summary>
        [Fact]
        public async void Post_ClientWithEmptyScope_ReturnsStatusForbidden()
        {
            // Arrange
            string org = "test";
            string appName = "app20";
            string requestUri = $"{BasePath}/applications?appId={org}/{appName}";

            Application appInfo = CreateApplication(org, appName);

            DocumentClientException dex = CreateDocumentClientExceptionForTesting("Not found", HttpStatusCode.NotFound);

            Mock<IApplicationRepository> applicationRepository = new Mock<IApplicationRepository>();
            applicationRepository.Setup(s => s.FindOne(It.IsAny<string>(), It.IsAny<string>())).ThrowsAsync(dex);
            applicationRepository.Setup(s => s.Create(It.IsAny<Application>())).ReturnsAsync((Application app) => app);

            HttpClient client = GetTestClient(applicationRepository.Object);
            string token = PrincipalUtil.GetOrgToken("testorg", scope: string.Empty);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            // Act
            HttpResponseMessage response = await client.PostAsync(requestUri, JsonContent.Create(appInfo, new MediaTypeHeaderValue("application/json")));

            // Assert
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            string content = response.Content.ReadAsStringAsync().Result;
            Assert.True(string.IsNullOrEmpty(content));
        }

        /// <summary>
        /// Scenario:
        ///   Post a simple application with an invalid id.
        /// Expected result:
        ///   Returns HttpStatus BadRequest with a reason phrase.
        /// Success criteria:
        ///   The response has correct status and the returned reason phrase has the correct keywords.
        /// </summary>
        [Fact]
        public async void Post_GivenApplicationWithInvalidId_ReturnsStatusBadRequestWithMessage()
        {
            // Arrange
            string org = "TEST";
            string appName = "app";
            string requestUri = $"{BasePath}/applications?appId={org}/{appName}";

            Application appInfo = CreateApplication(org, appName);

            Mock<IApplicationRepository> applicationRepository = new Mock<IApplicationRepository>();

            HttpClient client = GetTestClient(applicationRepository.Object);
            string token = PrincipalUtil.GetAccessToken("studio.designer");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            // Act
            HttpResponseMessage response = await client.PostAsync(requestUri, JsonContent.Create(appInfo, new MediaTypeHeaderValue("application/json")));

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

            string content = response.Content.ReadAsStringAsync().Result;

            Assert.Contains("not valid", content);
        }

        /// <summary>
        /// Scenario:
        ///   Soft delete an existing application but empty appId claim in context.
        /// Expected result:
        ///   Returns HttpStatus Forbidden and application will not be updated
        /// </summary>
        [Fact]
        public async void Delete_ClientWithEmptyAppId_ReturnsStatusForbidden()
        {
            // Arrange
            string org = "test";
            string appName = "app21";
            string requestUri = $"{BasePath}/applications/{org}/{appName}";

            Application appInfo = CreateApplication(org, appName);

            Mock<IApplicationRepository> applicationRepository = new Mock<IApplicationRepository>();
            applicationRepository.Setup(s => s.FindOne(It.IsAny<string>(), It.IsAny<string>())).ReturnsAsync(appInfo);
            applicationRepository.Setup(s => s.Update(It.IsAny<Application>())).ReturnsAsync((Application app) => app);

            HttpClient client = GetTestClient(applicationRepository.Object);

            string token = PrincipalUtil.GetAccessToken(string.Empty);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            // Act
            HttpResponseMessage response = await client.DeleteAsync(requestUri);

            // Assert
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            string content = response.Content.ReadAsStringAsync().Result;
            Assert.True(string.IsNullOrEmpty(content));
        }

        /// <summary>
        /// Scenario:
        ///   Soft delete an existing application but incorrect appId claim in context.
        /// Expected result:
        ///   Returns HttpStatus Forbidden and application will not be updated
        /// </summary>
        [Fact]
        public async void Delete_ClientWithIncorrectAppId_ReturnsStatusForbidden()
        {
            // Arrange
            string org = "test";
            string appName = "app21";
            string requestUri = $"{BasePath}/applications/{org}/{appName}";

            Application appInfo = CreateApplication(org, appName);

            Mock<IApplicationRepository> applicationRepository = new Mock<IApplicationRepository>();
            applicationRepository.Setup(s => s.FindOne(It.IsAny<string>(), It.IsAny<string>())).ReturnsAsync(appInfo);
            applicationRepository.Setup(s => s.Update(It.IsAny<Application>())).ReturnsAsync((Application app) => app);

            HttpClient client = GetTestClient(applicationRepository.Object);

            string token = PrincipalUtil.GetAccessToken("studddio.designer");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            // Act
            HttpResponseMessage response = await client.DeleteAsync(requestUri);

            // Assert
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            string content = response.Content.ReadAsStringAsync().Result;
            Assert.True(string.IsNullOrEmpty(content));
        }

        /// <summary>
        /// Scenario:
        ///   Soft delete an existing application
        /// Expected result:
        ///   Returns HttpStatus Accepted and an updated application
        /// Success criteria:
        ///   The response has correct status code and the returned application has updated valid to date.
        /// </summary>
        [Fact]
        public async void Delete_GivenExistingApplicationToSoftDelete_ReturnsStatusAcceptedWithUpdatedValidDateOnApplication()
        {
            // Arrange
            string org = "test";
            string appName = "app21";
            string requestUri = $"{BasePath}/applications/{org}/{appName}";

            Application appInfo = CreateApplication(org, appName);

            Mock<IApplicationRepository> applicationRepository = new Mock<IApplicationRepository>();
            applicationRepository.Setup(s => s.FindOne(It.IsAny<string>(), It.IsAny<string>())).ReturnsAsync(appInfo);
            applicationRepository.Setup(s => s.Update(It.IsAny<Application>())).ReturnsAsync((Application app) => app);

            HttpClient client = GetTestClient(applicationRepository.Object);

            string token = PrincipalUtil.GetAccessToken("studio.designer");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            // Act
            HttpResponseMessage response = await client.DeleteAsync(requestUri);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string content = response.Content.ReadAsStringAsync().Result;
            Application application = JsonConvert.DeserializeObject(content, typeof(Application)) as Application;

            Assert.NotNull(application);
            Assert.True(application.ValidTo < DateTime.UtcNow);
        }

        /// <summary>
        /// Create an application, read one, update it and get it one more time.
        /// </summary>
        [Fact]
        public async void GetAndUpdateApplication()
        {
            // Arrange
            string org = "test";
            string appName = "app21";
            string requestUri = $"{BasePath}/applications/{org}/{appName}";

            Application originalApp = CreateApplication(org, appName);

            Mock<IApplicationRepository> applicationRepository = new Mock<IApplicationRepository>();
            applicationRepository.Setup(s => s.FindOne(It.IsAny<string>(), It.IsAny<string>())).ReturnsAsync(originalApp);
            applicationRepository.Setup(s => s.Update(It.IsAny<Application>())).ReturnsAsync((Application app) => app);

            HttpClient client = GetTestClient(applicationRepository.Object);

            string token = PrincipalUtil.GetAccessToken("studio.designer");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            Application updatedApp = CreateApplication(org, appName);
            updatedApp.VersionId = "r34";
            updatedApp.PartyTypesAllowed = new PartyTypesAllowed { BankruptcyEstate = true };

            // Act
            HttpResponseMessage response = await client.PutAsync(requestUri, JsonContent.Create(updatedApp, new MediaTypeHeaderValue("application/json")));

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string content = response.Content.ReadAsStringAsync().Result;
            Application application = JsonConvert.DeserializeObject(content, typeof(Application)) as Application;

            Assert.NotNull(application);
            Assert.Equal("r34", application.VersionId);
            Assert.True(application.PartyTypesAllowed.BankruptcyEstate);
            Assert.False(application.PartyTypesAllowed.Person);
        }

        /// <summary>
        /// Create an application, read one, update it and get it one more time  but user has too low authentication level.
        /// </summary>
        [Fact]
        public async void GetAndUpdateApplication_AuthLv0_ReturnsStatusForbidden()
        {
            // Arrange
            string org = "test";
            string appName = "app21";
            string requestUri = $"{BasePath}/applications/{org}/{appName}";

            Application originalApp = CreateApplication(org, appName);

            Mock<IApplicationRepository> applicationRepository = new Mock<IApplicationRepository>();
            applicationRepository.Setup(s => s.FindOne(It.IsAny<string>(), It.IsAny<string>())).ReturnsAsync(originalApp);
            applicationRepository.Setup(s => s.Update(It.IsAny<Application>())).ReturnsAsync((Application app) => app);

            HttpClient client = GetTestClient(applicationRepository.Object);

            string token = PrincipalUtil.GetToken(10001, 50001, 0);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            Application updatedApp = CreateApplication(org, appName);
            updatedApp.VersionId = "r34";
            updatedApp.PartyTypesAllowed = new PartyTypesAllowed { BankruptcyEstate = true };

            // Act
            HttpResponseMessage response = await client.PutAsync(requestUri, JsonContent.Create(updatedApp, new MediaTypeHeaderValue("application/json")));

            // Assert
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            string content = response.Content.ReadAsStringAsync().Result;
            Assert.True(string.IsNullOrEmpty(content));
        }

        /// <summary>
        /// Create an application, read one, update it and get it one more time  but response is deny.
        /// </summary>
        [Fact]
        public async void GetAndUpdateApplication_ResponseIsDeny_ReturnsStatusForbidden()
        {
            // Arrange
            string org = "test";
            string appName = "app21";
            string requestUri = $"{BasePath}/applications/{org}/{appName}";

            Application originalApp = CreateApplication(org, appName);

            Mock<IApplicationRepository> applicationRepository = new Mock<IApplicationRepository>();
            applicationRepository.Setup(s => s.FindOne(It.IsAny<string>(), It.IsAny<string>())).ReturnsAsync(originalApp);
            applicationRepository.Setup(s => s.Update(It.IsAny<Application>())).ReturnsAsync((Application app) => app);

            HttpClient client = GetTestClient(applicationRepository.Object);

            string token = PrincipalUtil.GetToken(-10001, 50001);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            Application updatedApp = CreateApplication(org, appName);
            updatedApp.VersionId = "r34";
            updatedApp.PartyTypesAllowed = new PartyTypesAllowed { BankruptcyEstate = true };

            // Act
            HttpResponseMessage response = await client.PutAsync(requestUri, JsonContent.Create(updatedApp, new MediaTypeHeaderValue("application/json")));

            // Assert
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            string content = response.Content.ReadAsStringAsync().Result;
            Assert.True(string.IsNullOrEmpty(content));
        }

        /// <summary>
        /// Get all applications returns 200.
        /// </summary>
        [Fact]
        public async void GetAll_ReturnsOK()
        {
            // Arrange
            string requestUri = $"{BasePath}/applications";
            List<Application> expected = new List<Application>
            {
                CreateApplication("testorg", "testapp")
            };
            Mock<IApplicationRepository> applicationRepository = new Mock<IApplicationRepository>();
            applicationRepository.Setup(s => s.FindAll()).ReturnsAsync(expected);
            HttpClient client = GetTestClient(applicationRepository.Object);

            // Act
            HttpResponseMessage response = await client.GetAsync(requestUri);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        private static DocumentClientException CreateDocumentClientExceptionForTesting(string message, HttpStatusCode httpStatusCode)
        {
            Type type = typeof(DocumentClientException);

            string fullName = type.FullName ?? "wtf?";

            object documentClientExceptionInstance = type.Assembly.CreateInstance(
                fullName,
                false,
                BindingFlags.Instance | BindingFlags.NonPublic,
                null,
                new object[] { message, null, null, httpStatusCode, null },
                null,
                null);

            return (DocumentClientException)documentClientExceptionInstance;
        }

        private HttpClient GetTestClient(IApplicationRepository applicationRepository)
        {
            // No setup required for these services. They are not in use by the ApplicationController
            Mock<ISasTokenProvider> sasTokenProvider = new Mock<ISasTokenProvider>();
            Mock<IKeyVaultClientWrapper> keyVaultWrapper = new Mock<IKeyVaultClientWrapper>();
            Mock<IPartiesWithInstancesClient> partiesWrapper = new Mock<IPartiesWithInstancesClient>();

            Program.ConfigureSetupLogging();
            HttpClient client = _factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureTestServices(services =>
                {
                    services.AddMockRepositories();

                    services.AddSingleton(applicationRepository);

                    services.AddSingleton(sasTokenProvider.Object);
                    services.AddSingleton(keyVaultWrapper.Object);
                    services.AddSingleton(partiesWrapper.Object);
                    services.AddSingleton<IPDP, PepWithPDPAuthorizationMockSI>();
                    services.AddSingleton<IPostConfigureOptions<JwtCookieOptions>, JwtCookiePostConfigureOptionsStub>();
                });
            }).CreateClient();

            return client;
        }

        private Application CreateApplication(string org, string appName)
        {
            Application appInfo = new Application
            {
                Id = $"{org}/{appName}",
                VersionId = "r33",
                Title = new Dictionary<string, string>(),
                Org = org,
            };

            appInfo.Title.Add("nb", "Tittel");

            return appInfo;
        }
    }
}

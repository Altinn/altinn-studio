using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Implementation;
using AltinnCore.Authentication.Constants;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;
using Xunit;

namespace Designer.Tests.Services
{
    public class GiteaAPIWrapperTest
    {
        [Fact]
        public async Task CreateBranch_Successfull_BranchReturned()
        {
            // Arrange
            var handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);
            handlerMock
               .Protected()
               .Setup<Task<HttpResponseMessage>>(
                  "SendAsync",
                  ItExpr.IsAny<HttpRequestMessage>(),
                  ItExpr.IsAny<CancellationToken>())
               .ReturnsAsync(new HttpResponseMessage()
               {
                   StatusCode = HttpStatusCode.Created,
                   Content = new StringContent(JsonSerializer.Serialize(new Branch { Name = "branchName" }), Encoding.UTF8, "application/json"),
               })
               .Verifiable();

            // use real http client with mocked handler here
            var httpClient = new HttpClient(handlerMock.Object)
            {
                BaseAddress = new Uri("http://altinn3.no/repos/api/v1")
            };

            GiteaAPIWrapper sut = GetServiceForTest("testUser", httpClient);

            // Act
            Branch actual = await sut.CreateBranch("ttd", "apps-test-2021", "master");

            // Assert
            Assert.NotNull(actual);
        }

        [Fact]
        public async Task CreateBranch_ConflictFromGitea_NullReturned()
        {
            // Arrange
            var handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);
            handlerMock
               .Protected()
               .Setup<Task<HttpResponseMessage>>(
                  "SendAsync",
                  ItExpr.IsAny<HttpRequestMessage>(),
                  ItExpr.IsAny<CancellationToken>())
               .ReturnsAsync(new HttpResponseMessage()
               {
                   StatusCode = HttpStatusCode.Conflict
               })
               .Verifiable();

            // use real http client with mocked handler here
            var httpClient = new HttpClient(handlerMock.Object)
            {
                BaseAddress = new Uri("http://altinn3.no/repos/api/v1")
            };

            GiteaAPIWrapper sut = GetServiceForTest("testUser", httpClient);

            // Act
            Branch actual = await sut.CreateBranch("ttd", "apps-test-2021", "master");

            // Assert
            Assert.Null(actual);
        }

        [Fact]
        public async Task Search_Successfull_Repo_Returned_One_Page()
        {
            // Arrange
            SearchResults searchResult = new SearchResults();
            searchResult.Ok = true;
            searchResult.Data = GetRepositories();

            var handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);
            HttpResponseMessage httpResponseMessage = new HttpResponseMessage()
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent(JsonSerializer.Serialize(searchResult), Encoding.UTF8, "application/json"),
            };
            httpResponseMessage.Headers.Add("X-Total-Count", $"{searchResult.Data.Count}");

            handlerMock
               .Protected()
               .Setup<Task<HttpResponseMessage>>(
                  "SendAsync",
                  ItExpr.IsAny<HttpRequestMessage>(),
                  ItExpr.IsAny<CancellationToken>())
               .ReturnsAsync(httpResponseMessage)
               .Verifiable();

            // use real http client with mocked handler here
            var httpClient = new HttpClient(handlerMock.Object)
            {
                BaseAddress = new Uri("http://altinn3.no/repos/api/v1")
            };

            GiteaAPIWrapper giteaApi = GetServiceForTest("testUser", httpClient);

            SearchResults result = await giteaApi.SearchRepo(GetSearchOptions());
            Assert.Equal(searchResult.Data.Count, result.TotalCount);
            Assert.Equal(1, result.TotalPages);
        }

        [Fact]
        public async Task Search_Successfull_Repo_Returned_Multiple_Pages()
        {
            // Arrange
            SearchResults searchResult = new SearchResults();
            searchResult.Ok = true;
            searchResult.Data = GetRepositories();

            var handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);
            HttpResponseMessage httpResponseMessage = new HttpResponseMessage()
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent(JsonSerializer.Serialize(searchResult), Encoding.UTF8, "application/json"),
            };
            httpResponseMessage.Headers.Add("X-Total-Count", $"{searchResult.Data.Count}");
            string link = "<https://dev.altinn.studio/repos/api/v1/repos/search?limit=10&order=desc&page=2&sort=created&uid=658>; rel=\"next\"," +
            "<https://dev.altinn.studio/repos/api/v1/repos/search?limit=10&order=desc&page=27&sort=created&uid=658>; rel=\"last\"";
            httpResponseMessage.Headers.Add("Link", link);

            handlerMock
               .Protected()
               .Setup<Task<HttpResponseMessage>>(
                  "SendAsync",
                  ItExpr.IsAny<HttpRequestMessage>(),
                  ItExpr.IsAny<CancellationToken>())
               .ReturnsAsync(httpResponseMessage)
               .Verifiable();

            // use real http client with mocked handler here
            var httpClient = new HttpClient(handlerMock.Object)
            {
                BaseAddress = new Uri("http://altinn3.no/repos/api/v1")
            };

            GiteaAPIWrapper giteaApi = GetServiceForTest("testUser", httpClient);

            SearchOptions searchOptions = GetSearchOptions();
            searchOptions.Limit = 10;
            SearchResults result = await giteaApi.SearchRepo(searchOptions);
            Assert.Equal(searchResult.Data.Count, result.TotalCount);
            Assert.Equal(27, result.TotalPages);
        }

        [Fact]
        public async Task Search_Failed()
        {
            // Arrange
            var handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);
            HttpResponseMessage httpResponseMessage = new HttpResponseMessage()
            {
                StatusCode = HttpStatusCode.BadRequest
            };

            handlerMock
               .Protected()
               .Setup<Task<HttpResponseMessage>>(
                  "SendAsync",
                  ItExpr.IsAny<HttpRequestMessage>(),
                  ItExpr.IsAny<CancellationToken>())
               .ReturnsAsync(httpResponseMessage)
               .Verifiable();

            // use real http client with mocked handler here
            var httpClient = new HttpClient(handlerMock.Object)
            {
                BaseAddress = new Uri("http://altinn3.no/repos/api/v1")
            };

            GiteaAPIWrapper giteaApi = GetServiceForTest("testUser", httpClient);

            SearchResults result = await giteaApi.SearchRepo(GetSearchOptions());

            Assert.Null(result);
        }

        [Fact]
        public async Task Get_StarredRepos_Ok()
        {
            IList<Repository> repositories = GetRepositories();
            
            var handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);
            HttpResponseMessage httpResponseMessage = new HttpResponseMessage()
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent(JsonSerializer.Serialize(repositories), Encoding.UTF8, "application/json"),
            };

            handlerMock
              .Protected()
              .Setup<Task<HttpResponseMessage>>(
                 "SendAsync",
                 ItExpr.IsAny<HttpRequestMessage>(),
                 ItExpr.IsAny<CancellationToken>())
              .ReturnsAsync(httpResponseMessage)
              .Verifiable();

            // use real http client with mocked handler here
            var httpClient = new HttpClient(handlerMock.Object)
            {
                BaseAddress = new Uri("http://altinn3.no/designer/api/v1/user/starred")
            };

            GiteaAPIWrapper giteaApi = GetServiceForTest("testUser", httpClient);

            IList<Repository> result = await giteaApi.GetStarred();
            Assert.Equal(10, repositories.Count);
        }

        [Theory]
        [InlineData(true, HttpStatusCode.NoContent)]
        [InlineData(false, HttpStatusCode.InternalServerError)]
        public async Task Put_StarredRepos(bool expectedResult, HttpStatusCode httpStatusCode)
        {
            var handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);
            HttpResponseMessage httpResponseMessage = new HttpResponseMessage()
            {
                StatusCode = httpStatusCode,
            };

            handlerMock
              .Protected()
              .Setup<Task<HttpResponseMessage>>(
                 "SendAsync",
                 ItExpr.IsAny<HttpRequestMessage>(),
                 ItExpr.IsAny<CancellationToken>())
              .ReturnsAsync(httpResponseMessage)
              .Verifiable();

            // use real http client with mocked handler here
            var httpClient = new HttpClient(handlerMock.Object)
            {
                BaseAddress = new Uri("http://altinn3.no/designer/api/v1/user/starred")
            };

            GiteaAPIWrapper giteaApi = GetServiceForTest("testUser", httpClient);

            bool result = await giteaApi.PutStarred("org", "repository");

            Assert.Equal(expectedResult, result);
        }

        [Theory]
        [InlineData(true, HttpStatusCode.NoContent)]
        [InlineData(false, HttpStatusCode.InternalServerError)]
        public async Task Delete_StarredRepos(bool expectedResult, HttpStatusCode httpStatusCode)
        {
            var handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);
            HttpResponseMessage httpResponseMessage = new HttpResponseMessage()
            {
                StatusCode = httpStatusCode,
            };

            handlerMock
              .Protected()
              .Setup<Task<HttpResponseMessage>>(
                 "SendAsync",
                 ItExpr.IsAny<HttpRequestMessage>(),
                 ItExpr.IsAny<CancellationToken>())
              .ReturnsAsync(httpResponseMessage)
              .Verifiable();

            // use real http client with mocked handler here
            var httpClient = new HttpClient(handlerMock.Object)
            {
                BaseAddress = new Uri("http://altinn3.no/designer/api/v1/user/starred")
            };

            GiteaAPIWrapper giteaApi = GetServiceForTest("testUser", httpClient);

            bool result = await giteaApi.DeleteStarred("org", "repository");

            Assert.Equal(expectedResult, result);
        }

        [Fact]
        public async Task Get_Repository()
        {
            // Setting up the response message to get from Gitea for a repository request
            Repository repository = GetRepositories().First();
            HttpResponseMessage httpRepositoryResponseMessage = new HttpResponseMessage()
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent(JsonSerializer.Serialize(repository), Encoding.UTF8, "application/json"),
            };

            // Configuring the mock handler to return the response message for repository requests
            var handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);
            handlerMock
              .Protected()
              .Setup<Task<HttpResponseMessage>>(
                 "SendAsync",
                 ItExpr.IsAny<HttpRequestMessage>(),
                 ItExpr.IsAny<CancellationToken>())
              .ReturnsAsync(httpRepositoryResponseMessage)              
              .Verifiable();

            // Setting up the response message to get from Gitea for a organization request (which is done as part of getting the repository)
            Organization organization = new Organization() { Username = "ttd", FullName = "Testdepartementet", Id = 658 };
            HttpResponseMessage httpOrganizationResponseMessage = new HttpResponseMessage()
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent(JsonSerializer.Serialize(organization), Encoding.UTF8, "application/json"),
            };

            // Configuring the mock handler to return the response message for organization requests.
            // Note the org_ prefix added to the org code, this is how it needs to be when requesting a org from Gitea.
            handlerMock
                .Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.Is<HttpRequestMessage>(request => request.Method == HttpMethod.Get && request.RequestUri.AbsolutePath.Contains("/orgs/org_ttd")),
                    ItExpr.IsAny<CancellationToken>())
                .ReturnsAsync(httpOrganizationResponseMessage)
                .Verifiable();

            // Injecting the mock handler into a real http client
            var httpClient = new HttpClient(handlerMock.Object)
            {
                BaseAddress = new Uri("http://altinn3.no/designer/api/v1/")
            };

            // Passing the test specific mock setup in, sprinkles a bit more mock setup and returns a valid GiteaAPIWrapper
            GiteaAPIWrapper giteaApi = GetServiceForTest("testUser", httpClient);

            // Act
            Repository result = await giteaApi.GetRepository("ttd", "repo");

            // Assert
            Assert.Equal(1769, result.Id);
        }

        private static HttpContext GetHttpContextForTestUser(string userName)
        {
            List<Claim> claims = new List<Claim>();
            claims.Add(new Claim(AltinnCoreClaimTypes.Developer, userName, ClaimValueTypes.String, "altinn.no"));
            ClaimsIdentity identity = new ClaimsIdentity("TestUserLogin");
            identity.AddClaims(claims);

            ClaimsPrincipal principal = new ClaimsPrincipal(identity);
            HttpContext c = new DefaultHttpContext();
            c.Request.HttpContext.User = principal;

            return c;
        }

        private static GiteaAPIWrapper GetServiceForTest(string developer, HttpClient c)
        {
            HttpContext ctx = GetHttpContextForTestUser(developer);

            Mock<IHttpContextAccessor> httpContextAccessorMock = new Mock<IHttpContextAccessor>();
            httpContextAccessorMock.Setup(s => s.HttpContext).Returns(ctx);

            IOptions<ServiceRepositorySettings> repoSettings = Options.Create(new ServiceRepositorySettings());
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(RepositorySITests).Assembly.Location).LocalPath);
            repoSettings.Value.RepositoryLocation = Path.Combine(unitTestFolder, @"..\..\..\_TestData\Repositories\");

            GiteaAPIWrapper service = new GiteaAPIWrapper(
                repoSettings,
                httpContextAccessorMock.Object,
                new MemoryCache(new MemoryCacheOptions()),
                new Mock<ILogger<GiteaAPIWrapper>>().Object,
                c);

            return service;
        }

        private static List<Repository> GetRepositories()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(GiteaAPIWrapperTest).Assembly.Location).LocalPath);
            string path = Path.Combine(unitTestFolder, $@"..\..\..\_TestData\RepoCollection\repositories.json");
            if (File.Exists(path))
            {
                string repositories = File.ReadAllText(path);
                return JsonSerializer.Deserialize<List<Repository>>(repositories, new JsonSerializerOptions() { PropertyNameCaseInsensitive = true });
            }

            return null;
        }

        private static SearchOptions GetSearchOptions()
        {
            SearchOptions searchOption = new SearchOptions();
            searchOption.UId = 658;
            searchOption.SortBy = "created";
            searchOption.Order = "desc";
            return searchOption;
        }
    }
}

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Implementation;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
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
                BaseAddress = new Uri("http://studio.localhost/repos/api/v1")
            };

            GiteaAPIWrapper sut = GetServiceForTest(httpClient);

            // Act
            Branch actual = await sut.CreateBranch("ttd", "apps-test-2021", "master");

            // Assert
            Assert.NotNull(actual);
            handlerMock.VerifyAll();
        }

        [Fact]
        public async Task CreateBranch_ConflictFromGitea_ThrowsException()
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
                BaseAddress = new Uri("http://studio.localhost/repos/api/v1")
            };

            GiteaAPIWrapper sut = GetServiceForTest(httpClient);

            // Act
            await Assert.ThrowsAsync<GiteaApiWrapperException>(() => sut.CreateBranch("ttd", "apps-test-2021", "master"));
            handlerMock.VerifyAll();
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
                BaseAddress = new Uri("http://studio.localhost/repos/api/v1")
            };

            GiteaAPIWrapper giteaApi = GetServiceForTest(httpClient);

            SearchResults result = await giteaApi.SearchRepo(GetSearchOptions());

            Assert.Equal(searchResult.Data.Count, result.TotalCount);
            Assert.Equal(1, result.TotalPages);
            handlerMock.VerifyAll();
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
                BaseAddress = new Uri("http://studio.localhost/repos/api/v1")
            };

            GiteaAPIWrapper giteaApi = GetServiceForTest(httpClient);

            SearchOptions searchOptions = GetSearchOptions();
            searchOptions.Limit = 10;
            SearchResults result = await giteaApi.SearchRepo(searchOptions);
            Assert.Equal(searchResult.Data.Count, result.TotalCount);
            Assert.Equal(27, result.TotalPages);
            handlerMock.VerifyAll();
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
                BaseAddress = new Uri("http://studio.localhost/repos/api/v1")
            };

            GiteaAPIWrapper giteaApi = GetServiceForTest(httpClient);

            SearchResults result = await giteaApi.SearchRepo(GetSearchOptions());

            Assert.Null(result);
            handlerMock.VerifyAll();
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
                BaseAddress = new Uri("http://studio.localhost/designer/api/user/starred")
            };

            GiteaAPIWrapper giteaApi = GetServiceForTest(httpClient);

            await giteaApi.GetStarred();
            Assert.Equal(10, repositories.Count);
            handlerMock.VerifyAll();
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
                BaseAddress = new Uri("http://studio.localhost/designer/api/user/starred")
            };

            GiteaAPIWrapper giteaApi = GetServiceForTest(httpClient);

            bool result = await giteaApi.PutStarred("org", "repository");

            Assert.Equal(expectedResult, result);
            handlerMock.VerifyAll();
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
                BaseAddress = new Uri("http://studio.localhost/designer/api/user/starred")
            };

            GiteaAPIWrapper giteaApi = GetServiceForTest(httpClient);

            bool result = await giteaApi.DeleteStarred("org", "repository");

            Assert.Equal(expectedResult, result);
            handlerMock.VerifyAll();
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
                    ItExpr.Is<HttpRequestMessage>(request => request.Method == HttpMethod.Get && request.RequestUri.AbsolutePath.Contains("/orgs/ttd")),
                    ItExpr.IsAny<CancellationToken>())
                .ReturnsAsync(httpOrganizationResponseMessage)
                .Verifiable();

            // Injecting the mock handler into a real http client
            var httpClient = new HttpClient(handlerMock.Object)
            {
                BaseAddress = new Uri("http://studio.localhost/designer/api/")
            };

            // Passing the test specific mock setup in, sprinkles a bit more mock setup and returns a valid GiteaAPIWrapper
            GiteaAPIWrapper giteaApi = GetServiceForTest(httpClient);

            // Act
            Repository result = await giteaApi.GetRepository("ttd", "repo");

            // Assert
            Assert.Equal(1769, result.Id);
            handlerMock.VerifyAll();
        }


        [Fact]
        public async Task GetDirectoryAsync_Successful_DirectoryContentsReturned()
        {
            // Arrange
            List<FileSystemObject> expectedFileSystemObjects =
            [
                new FileSystemObject() { Name = "file1.txt", Type = "file" },
                new FileSystemObject() { Name = "subdirectory", Type = "dir" },
                new FileSystemObject() { Name = "file2.cs", Type = "file" }
            ];

            var handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);
            handlerMock
               .Protected()
               .Setup<Task<HttpResponseMessage>>(
                  "SendAsync",
                  ItExpr.IsAny<HttpRequestMessage>(),
                  ItExpr.IsAny<CancellationToken>())
               .ReturnsAsync(new HttpResponseMessage()
               {
                   StatusCode = HttpStatusCode.OK,
                   Content = new StringContent(JsonSerializer.Serialize(expectedFileSystemObjects), Encoding.UTF8, "application/json"),
               })
               .Verifiable();

            var httpClient = new HttpClient(handlerMock.Object)
            {
                BaseAddress = new Uri("http://studio.localhost/repos/api/v1")
            };

            GiteaAPIWrapper sut = GetServiceForTest(httpClient);

            // Act
            List<FileSystemObject> actual = await sut.GetDirectoryAsync("ttd", "apps-test-2021", "src/models");

            // Assert
            Assert.NotNull(actual);
            Assert.Equal(3, actual.Count);
            Assert.Equal("file1.txt", actual[0].Name);
            Assert.Equal("subdirectory", actual[1].Name);
            Assert.Equal("file2.cs", actual[2].Name);
            handlerMock.VerifyAll();
        }

        [Fact]
        public async Task GetDirectoryAsync_WithReference_Successful_DirectoryContentsReturned()
        {
            // Arrange
            List<FileSystemObject> expectedFileSystemObjects =
            [
                new FileSystemObject { Name = "config.json", Type = "file" }
            ];

            var handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);
            handlerMock
               .Protected()
               .Setup<Task<HttpResponseMessage>>(
                  "SendAsync",
                  ItExpr.Is<HttpRequestMessage>(req => req.RequestUri.Query.Contains("ref=feature-branch")),
                  ItExpr.IsAny<CancellationToken>())
               .ReturnsAsync(new HttpResponseMessage()
               {
                   StatusCode = HttpStatusCode.OK,
                   Content = new StringContent(JsonSerializer.Serialize(expectedFileSystemObjects), Encoding.UTF8, "application/json"),
               })
               .Verifiable();

            var httpClient = new HttpClient(handlerMock.Object)
            {
                BaseAddress = new Uri("http://studio.localhost/repos/api/v1")
            };

            GiteaAPIWrapper sut = GetServiceForTest(httpClient);

            // Act
            List<FileSystemObject> actual = await sut.GetDirectoryAsync("ttd", "apps-test-2021", "config", "feature-branch");

            // Assert
            Assert.NotNull(actual);
            Assert.Single(actual);
            Assert.Equal("config.json", actual[0].Name);
            handlerMock.VerifyAll();
        }

        [Fact]
        public async Task GetDirectoryAsync_DirectoryNotFound_ThrowsDirectoryNotFoundException()
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
                   StatusCode = HttpStatusCode.NotFound
               })
               .Verifiable();

            var httpClient = new HttpClient(handlerMock.Object)
            {
                BaseAddress = new Uri("http://studio.localhost/repos/api/v1")
            };

            GiteaAPIWrapper sut = GetServiceForTest(httpClient);

            // Act & Assert
            DirectoryNotFoundException exception = await Assert.ThrowsAsync<DirectoryNotFoundException>(
                () => sut.GetDirectoryAsync("ttd", "apps-test-2021", "nonexistent/directory"));

            Assert.Contains("Directory nonexistent/directory not found in repository ttd/apps-test-2021", exception.Message);
            handlerMock.VerifyAll();
        }

        [Fact]
        public async Task GetDirectoryAsync_DirectoryNotFoundWithReference_ThrowsDirectoryNotFoundException()
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
                   StatusCode = HttpStatusCode.NotFound
               })
               .Verifiable();

            var httpClient = new HttpClient(handlerMock.Object)
            {
                BaseAddress = new Uri("http://studio.localhost/repos/api/v1")
            };

            GiteaAPIWrapper sut = GetServiceForTest(httpClient);

            // Act & Assert
            DirectoryNotFoundException exception = await Assert.ThrowsAsync<DirectoryNotFoundException>(
                () => sut.GetDirectoryAsync("ttd", "apps-test-2021", "missing/path", "main"));

            Assert.Contains("Directory missing/path not found in repository ttd/apps-test-2021 at reference main", exception.Message);
            handlerMock.VerifyAll();
        }

        [Fact]
        public async Task GetDirectoryAsync_OtherHttpError_ReturnsEmptyList()
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
                   StatusCode = HttpStatusCode.InternalServerError
               })
               .Verifiable();

            var httpClient = new HttpClient(handlerMock.Object)
            {
                BaseAddress = new Uri("http://studio.localhost/repos/api/v1")
            };

            GiteaAPIWrapper sut = GetServiceForTest(httpClient);

            // Act
            List<FileSystemObject> actual = await sut.GetDirectoryAsync("ttd", "apps-test-2021", "src");

            // Assert
            Assert.NotNull(actual);
            Assert.Empty(actual);
            handlerMock.VerifyAll();
        }

        [Fact]
        public async Task GetDirectoryAsync_EmptyDirectoryResponse_ReturnsEmptyList()
        {
            // Arrange
            var emptyFileSystemObjects = new List<FileSystemObject>();

            var handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);
            handlerMock
               .Protected()
               .Setup<Task<HttpResponseMessage>>(
                  "SendAsync",
                  ItExpr.IsAny<HttpRequestMessage>(),
                  ItExpr.IsAny<CancellationToken>())
               .ReturnsAsync(new HttpResponseMessage()
               {
                   StatusCode = HttpStatusCode.OK,
                   Content = new StringContent(JsonSerializer.Serialize(emptyFileSystemObjects), Encoding.UTF8, "application/json"),
               })
               .Verifiable();

            var httpClient = new HttpClient(handlerMock.Object)
            {
                BaseAddress = new Uri("http://studio.localhost/repos/api/v1")
            };

            GiteaAPIWrapper sut = GetServiceForTest(httpClient);

            // Act
            List<FileSystemObject> actual = await sut.GetDirectoryAsync("ttd", "apps-test-2021", "empty-directory");

            // Assert
            Assert.NotNull(actual);
            Assert.Empty(actual);
            handlerMock.VerifyAll();
        }

        [Fact]
        public async Task GetCodeListDirectoryContentAsync_Successful_ReturnsFileContents()
        {
            // Arrange
            List<FileSystemObject> directoryFiles =
            [
                new() { Name = "countries.json", Type = "file" },
                new() { Name = "currencies.json", Type = "file" }
            ];

            var fileContent1 = new FileSystemObject { Name = "countries.json", Type = "file", Content = "country data" };
            var fileContent2 = new FileSystemObject { Name = "currencies.json", Type = "file", Content = "currency data" };

            var handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);

            // Mock GetDirectoryAsync call - note the correct path structure
            handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.Is<HttpRequestMessage>(req => req.RequestUri.AbsolutePath.Contains("/repos/ttd/apps-test-2021/contents/CodeLists")),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage()
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent(JsonSerializer.Serialize(directoryFiles), Encoding.UTF8, "application/json"),
            });

            // Mock GetFileAsync calls for each file
            handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.Is<HttpRequestMessage>(req => req.RequestUri.AbsolutePath.Contains("/repos/ttd/apps-test-2021/contents/CodeLists/countries.json")),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage()
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent(JsonSerializer.Serialize(fileContent1), Encoding.UTF8, "application/json"),
            });

            handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.Is<HttpRequestMessage>(req => req.RequestUri.AbsolutePath.Contains("/repos/ttd/apps-test-2021/contents/CodeLists/currencies.json")),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage()
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent(JsonSerializer.Serialize(fileContent2), Encoding.UTF8, "application/json"),
            });

            var httpClient = new HttpClient(handlerMock.Object)
            {
                BaseAddress = new Uri("http://studio.localhost/repos/api/v1")
            };

            GiteaAPIWrapper sut = GetServiceForTest(httpClient);

            // Act
            List<FileSystemObject> actual = await sut.GetCodeListDirectoryContentAsync("ttd", "apps-test-2021");

            // Assert
            Assert.NotNull(actual);
            Assert.Equal(2, actual.Count);
            Assert.Contains(actual, f => f.Name == "countries.json");
            Assert.Contains(actual, f => f.Name == "currencies.json");
            handlerMock.VerifyAll();
        }

        [Fact]
        public async Task GetCodeListDirectoryContentAsync_WithReference_FetchesFromRef()
        {
            // Arrange
            var dir = new List<FileSystemObject> { new() { Name = "countries.json", Type = "file" } };
            var file = new FileSystemObject { Name = "countries.json", Type = "file", Content = "data" };
            var handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);
            handlerMock.Protected().Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.Is<HttpRequestMessage>(req => req.RequestUri.Query.Contains("ref=feature-branch") && req.RequestUri.AbsolutePath.Contains("/contents/CodeLists")),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage { StatusCode = HttpStatusCode.OK, Content = new StringContent(JsonSerializer.Serialize(dir), Encoding.UTF8, "application/json") });

            handlerMock.Protected().Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.Is<HttpRequestMessage>(req => req.RequestUri.Query.Contains("ref=feature-branch") && req.RequestUri.AbsolutePath.Contains("/contents/CodeLists/countries.json")),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage { StatusCode = HttpStatusCode.OK, Content = new StringContent(JsonSerializer.Serialize(file), Encoding.UTF8, "application/json") });

            var httpClient = new HttpClient(handlerMock.Object) { BaseAddress = new Uri("http://studio.localhost/repos/api/v1") };
            var sut = GetServiceForTest(httpClient);

            // Act
            var result = await sut.GetCodeListDirectoryContentAsync("ttd", "apps-test-2021", "feature-branch");

            // Assert
            Assert.Single(result);
            Assert.Equal("countries.json", result[0].Name);
            handlerMock.VerifyAll();
        }

        [Fact]
        public async Task GetCodeListDirectoryContentAsync_DirectoryNotFound_ReturnsEmptyList()
        {
            // Arrange
            var handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);
            handlerMock
               .Protected()
               .Setup<Task<HttpResponseMessage>>(
                  "SendAsync",
                  ItExpr.Is<HttpRequestMessage>(req => req.RequestUri.AbsolutePath.Contains("/repos/ttd/apps-test-2021/contents/CodeLists")),
                  ItExpr.IsAny<CancellationToken>())
               .ReturnsAsync(new HttpResponseMessage()
               {
                   StatusCode = HttpStatusCode.NotFound
               })
               .Verifiable();

            var httpClient = new HttpClient(handlerMock.Object)
            {
                BaseAddress = new Uri("http://studio.localhost/repos/api/v1")
            };

            GiteaAPIWrapper sut = GetServiceForTest(httpClient);

            // Act
            List<FileSystemObject> actual = await sut.GetCodeListDirectoryContentAsync("ttd", "apps-test-2021");

            // Assert
            Assert.NotNull(actual);
            Assert.Empty(actual);
            handlerMock.VerifyAll();
        }

        [Fact]
        public async Task GetCodeListDirectoryContentAsync_EmptyDirectory_ReturnsEmptyList()
        {
            // Arrange
            var emptyDirectoryFiles = new List<FileSystemObject>();

            var handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);
            handlerMock
               .Protected()
               .Setup<Task<HttpResponseMessage>>(
                  "SendAsync",
                  ItExpr.Is<HttpRequestMessage>(req => req.RequestUri.AbsolutePath.Contains("repos/ttd/apps-test-2021/contents/CodeLists")),
                  ItExpr.IsAny<CancellationToken>())
               .ReturnsAsync(new HttpResponseMessage()
               {
                   StatusCode = HttpStatusCode.OK,
                   Content = new StringContent(JsonSerializer.Serialize(emptyDirectoryFiles), Encoding.UTF8, "application/json"),
               })
               .Verifiable();

            var httpClient = new HttpClient(handlerMock.Object)
            {
                BaseAddress = new Uri("http://studio.localhost/repos/api/v1")
            };

            GiteaAPIWrapper sut = GetServiceForTest(httpClient);

            // Act
            List<FileSystemObject> actual = await sut.GetCodeListDirectoryContentAsync("ttd", "apps-test-2021");

            // Assert
            Assert.NotNull(actual);
            Assert.Empty(actual);
            handlerMock.VerifyAll();
        }

        [Fact]
        public async Task GetCodeListDirectoryContentAsync_SomeFilesNull_FiltersOutNullFiles()
        {
            // Arrange
            List<FileSystemObject> directoryFiles =
            [
                new FileSystemObject { Name = "valid-file.json", Type = "file" },
                new FileSystemObject { Name = "invalid-file.json", Type = "file" }
            ];

            var validFileContent = new FileSystemObject { Name = "valid-file.json", Type = "file", Content = "valid data" };

            var handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);

            handlerMock
               .Protected()
               .Setup<Task<HttpResponseMessage>>(
                  "SendAsync",
                  ItExpr.Is<HttpRequestMessage>(req => req.RequestUri.AbsolutePath.Contains("repos/ttd/apps-test-2021/contents/CodeLists") && !req.RequestUri.AbsolutePath.Contains(".json")),
                  ItExpr.IsAny<CancellationToken>())
               .ReturnsAsync(new HttpResponseMessage()
               {
                   StatusCode = HttpStatusCode.OK,
                   Content = new StringContent(JsonSerializer.Serialize(directoryFiles), Encoding.UTF8, "application/json"),
               })
               .Verifiable();

            handlerMock
               .Protected()
               .Setup<Task<HttpResponseMessage>>(
                  "SendAsync",
                  ItExpr.Is<HttpRequestMessage>(req => req.RequestUri.AbsolutePath.Contains("repos/ttd/apps-test-2021/contents/CodeLists/valid-file.json")),
                  ItExpr.IsAny<CancellationToken>())
               .ReturnsAsync(new HttpResponseMessage()
               {
                   StatusCode = HttpStatusCode.OK,
                   Content = new StringContent(JsonSerializer.Serialize(validFileContent), Encoding.UTF8, "application/json"),
               })
               .Verifiable();

            handlerMock
               .Protected()
               .Setup<Task<HttpResponseMessage>>(
                  "SendAsync",
                  ItExpr.Is<HttpRequestMessage>(req => req.RequestUri.AbsolutePath.Contains("repos/ttd/apps-test-2021/contents/CodeLists/invalid-file.json")),
                  ItExpr.IsAny<CancellationToken>())
               .ReturnsAsync(new HttpResponseMessage()
               {
                   StatusCode = HttpStatusCode.InternalServerError
               })
               .Verifiable();

            var httpClient = new HttpClient(handlerMock.Object)
            {
                BaseAddress = new Uri("http://studio.localhost/repos/api/v1")
            };

            GiteaAPIWrapper sut = GetServiceForTest(httpClient);

            // Act
            List<FileSystemObject> actual = await sut.GetCodeListDirectoryContentAsync("ttd", "apps-test-2021");

            // Assert
            Assert.NotNull(actual);
            Assert.Single(actual); // Only the valid file should be returned
            Assert.Equal("valid-file.json", actual[0].Name);
            handlerMock.VerifyAll();
        }

        [Fact]
        public async Task ModifyMultipleFiles_WithMultipleFiles_ReturnsSuccess()
        {
            // Arrange
            var handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);

            const string UpdateTitle = "updated_file";
            const string CreateTitle = "created_file";


            List<CodeListWrapper> toUpdate = [new()
            {
                Title = UpdateTitle,
                CodeList = SetupCodeList(),
                HasError = false,
            }];
            List<CodeListWrapper> toCreate = [new()
            {
                Title = CreateTitle,
                CodeList = SetupCodeList(),
                HasError = false,
            }];

            string ser = JsonSerializer.Serialize(toUpdate);
            byte[] bytes = Encoding.UTF8.GetBytes(ser);
            string base64 = Convert.ToBase64String(bytes);
            string updateContent = base64;

            ser = JsonSerializer.Serialize(toCreate);
            bytes = Encoding.UTF8.GetBytes(ser);
            base64 = Convert.ToBase64String(bytes);
            string createContent = base64;

            var dto = new GiteaMultipleFilesDto
            {
                Author = new GiteaIdentity { Name = "testuser" },
                Committer = new GiteaIdentity { Name = "testuser" },
                Message = "Updating multiple files",
                Files = [
                    new FileOperationContext
                    {
                        Path = $"{UpdateTitle}.txt",
                        Content = updateContent,
                        Operation = FileOperation.Update,
                        Sha = "existing-file-sha"
                    },
                    new FileOperationContext
                    {
                        Path = $"{CreateTitle}.txt",
                        Content = createContent,
                        Operation = FileOperation.Create
                    },
                    new FileOperationContext
                    {
                        Path = "file2.txt",
                        Operation = FileOperation.Delete,
                        Sha = "to-delete-file-sha"
                    }
                ]
            };

            handlerMock
                .Protected()
                .Setup<Task<HttpResponseMessage>>(
                   "SendAsync",
                   ItExpr.Is<HttpRequestMessage>(req => req.Method == HttpMethod.Post && req.RequestUri.AbsolutePath.Contains("/repos/ttd/apps-test-2021/contents")),
                   ItExpr.IsAny<CancellationToken>())
                .ReturnsAsync(new HttpResponseMessage()
                {
                    StatusCode = HttpStatusCode.OK,
                })
                .Verifiable();

            var httpClient = new HttpClient(handlerMock.Object)
            {
                BaseAddress = new Uri("http://studio.localhost/repos/api/v1")
            };

            GiteaAPIWrapper sut = GetServiceForTest(httpClient);

            // Act
            bool result = await sut.ModifyMultipleFiles("ttd", "apps-test-2021", dto);

            // Assert
            Assert.True(result);
            handlerMock.VerifyAll();
        }

        [Fact]
        public async Task ModifyMultipleFiles_WithFailedRequest_ReturnsFalse_AndLogsError()
        {
            // Arrange
            var handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);

            const string UpdateTitle = "updated_file";

            List<CodeListWrapper> toUpdate = [new()
            {
                Title = UpdateTitle,
                CodeList = null,
                HasError = true,
            }];

            string ser = JsonSerializer.Serialize(toUpdate);
            byte[] bytes = Encoding.UTF8.GetBytes(ser);
            string base64 = Convert.ToBase64String(bytes);
            string updateContent = base64;

            var dto = new GiteaMultipleFilesDto
            {
                Author = new GiteaIdentity { Name = "testuser" },
                Committer = new GiteaIdentity { Name = "testuser" },
                Files = [
                    new FileOperationContext
                    {
                        Path = $"{UpdateTitle}.txt",
                        Content = updateContent,
                        Operation = FileOperation.Update,
                        Sha = "existing-file-sha"
                    },
                ]
            };

            var response = new { message = "this went wrong", url = "someurl" };
            string responseAsJson = JsonSerializer.Serialize(response);

            handlerMock
                .Protected()
                .Setup<Task<HttpResponseMessage>>(
                   "SendAsync",
                   ItExpr.Is<HttpRequestMessage>(req => req.Method == HttpMethod.Post && req.RequestUri.AbsolutePath.Contains("/repos/ttd/apps-test-2021/contents")),
                   ItExpr.IsAny<CancellationToken>())
                .ReturnsAsync(new HttpResponseMessage()
                {
                    StatusCode = HttpStatusCode.BadRequest,
                    Content = new StringContent(responseAsJson, Encoding.UTF8, "application/json"),
                })
                .Verifiable();
            var httpClient = new HttpClient(handlerMock.Object)
            {
                BaseAddress = new Uri("http://studio.localhost/repos/api/v1")
            };

            var loggerMock = new Mock<ILogger<GiteaAPIWrapper>>();
            loggerMock.Setup(
                l => l.Log(
                It.Is<LogLevel>(ll => ll == LogLevel.Error),
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString().Contains("ModifyMultipleFiles failed with status code BadRequest for ttd/apps-test-2021. Url: someurl, Message: this went wrong")),
                It.IsAny<Exception>(),
                It.Is<Func<It.IsAnyType, Exception, string>>((v, t) => true))
            );

            GiteaAPIWrapper sut = GetServiceForTest(httpClient, loggerMock.Object);

            // Act
            bool result = await sut.ModifyMultipleFiles("ttd", "apps-test-2021", dto);

            // Assert
            Assert.False(result);
            handlerMock.VerifyAll();
            loggerMock.VerifyAll();
        }

        private static CodeList SetupCodeList()
        {
            Dictionary<string, string> label = new() { { "nb", "tekst" }, { "en", "text" } };
            Dictionary<string, string> description = new() { { "nb", "Dette er en tekst" }, { "en", "This is a text" } };
            Dictionary<string, string> helpText = new() { { "nb", "Velg dette valget for å få en tekst" }, { "en", "Choose this option to get a text" } };
            List<Code> listOfCodes =
            [
                new()
                {
                    Value = "value1",
                    Label = label,
                    Description = description,
                    HelpText = helpText,
                    Tags = ["test-data"]
                }
            ];
            CodeListSource source = new() { Name = "test-data-files" };
            CodeList codeList = new()
            {
                Source = source,
                Codes = listOfCodes,
                TagNames = ["test-data-category"]
            };
            return codeList;
        }

        private static GiteaAPIWrapper GetServiceForTest(HttpClient client, ILogger<GiteaAPIWrapper> logger = null)
        {
            HttpContext context = new DefaultHttpContext();

            Mock<IHttpContextAccessor> httpContextAccessorMock = new Mock<IHttpContextAccessor>();
            httpContextAccessorMock.Setup(s => s.HttpContext).Returns(context);

            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(RepositorySITests).Assembly.Location).LocalPath);
            var repoSettings = new ServiceRepositorySettings
            {
                RepositoryLocation = Path.Combine(unitTestFolder, "..", "..", "..", "_TestData", "Repositories")
            };

            GiteaAPIWrapper service = new(
                repoSettings,
                httpContextAccessorMock.Object,
                new MemoryCache(new MemoryCacheOptions()),
                logger ?? new Mock<ILogger<GiteaAPIWrapper>>().Object,
                client);

            return service;
        }

        private static List<Repository> GetRepositories()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(GiteaAPIWrapperTest).Assembly.Location).LocalPath);
            string path = Path.Combine(unitTestFolder, "..", "..", "..", "_TestData", "RepoCollection", "repositories.json");
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

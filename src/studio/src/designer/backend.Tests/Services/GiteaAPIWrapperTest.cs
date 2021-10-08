using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;

using AltinnCore.Authentication.Constants;

using Designer.Tests.Utils;

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
                BaseAddress = new Uri("http://local.altinn.studio/repos/api/v1")
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
                BaseAddress = new Uri("http://local.altinn.studio/repos/api/v1")
            };

            GiteaAPIWrapper sut = GetServiceForTest("testUser", httpClient);

            // Act
            Branch actual = await sut.CreateBranch("ttd", "apps-test-2021", "master");

            // Assert
            Assert.Null(actual);
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
                new Mock<IMemoryCache>().Object,
                new Mock<ILogger<GiteaAPIWrapper>>().Object,
                c);

            return service;
        }
    }
}

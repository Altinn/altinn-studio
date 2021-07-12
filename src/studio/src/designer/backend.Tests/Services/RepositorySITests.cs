using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Claims;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using AltinnCore.Authentication.Constants;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;

using Xunit;

namespace Designer.Tests.Services
{
    public class RepositorySITests
    {
        [Fact]
        public void GetContents_FindsFolder_ReturnsListOfFileSystemObjects()
        {
            // Arrange
            List<FileSystemObject> expected = new List<FileSystemObject>
            {
                new FileSystemObject
                {
                    Name = "App",
                    Type = FileSystemObjectType.Dir.ToString(),
                    Path = "App"
                },
                new FileSystemObject
                {
                    Name = "App.sln",
                    Type = FileSystemObjectType.File.ToString(),
                    Path = "App.sln",
                    Encoding = "Unicode (UTF-8)"
                },
            };

            int expectedCount = 2;

            HttpContext httpContext = GetHttpContextForTestUser("testUser");
            Mock<IHttpContextAccessor> httpContextAccessorMock = new Mock<IHttpContextAccessor>();
            httpContextAccessorMock.Setup(s => s.HttpContext).Returns(httpContext);

            RepositorySI sut = GetServiceForTest(httpContextAccessorMock);

            // Act
            List<FileSystemObject> actual = sut.GetContents("ttd", "apps-test");

            // Assert
            Assert.Equal(expected.First().Type, actual.First().Type);
            Assert.Equal(expectedCount, actual.Count);
        }

        [Fact]
        public void GetContents_FindsFile_ReturnsOneFileSystemObject()
        {
            // Arrange
            List<FileSystemObject> expected = new List<FileSystemObject>
            {
               new FileSystemObject
                {
                    Name = "appsettings.json",
                    Type = FileSystemObjectType.File.ToString(),
                    Path = "App/appsettings.json",
                    Encoding = "Unicode (UTF-8)"
                },
            };

            int expectedCount = 1;

            HttpContext httpContext = GetHttpContextForTestUser("testUser");
            Mock<IHttpContextAccessor> httpContextAccessorMock = new Mock<IHttpContextAccessor>();
            httpContextAccessorMock.Setup(s => s.HttpContext).Returns(httpContext);

            RepositorySI sut = GetServiceForTest(httpContextAccessorMock);

            // Act
            List<FileSystemObject> actual = sut.GetContents("ttd", "apps-test", "App/appsettings.json");

            // Assert
            Assert.Equal(expected.First().Type, actual.First().Type);
            Assert.Equal(expectedCount, actual.Count);
        }

        [Fact]
        public void GetContents_LocalCloneOfRepositoryNotAvailable_ReturnsNull()
        {
            // Arrange
            HttpContext httpContext = GetHttpContextForTestUser("testUser");
            Mock<IHttpContextAccessor> httpContextAccessorMock = new Mock<IHttpContextAccessor>();
            httpContextAccessorMock.Setup(s => s.HttpContext).Returns(httpContext);

            RepositorySI sut = GetServiceForTest(httpContextAccessorMock);

            // Act
            List<FileSystemObject> actual = sut.GetContents("ttd", "test-apps");

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

        private static RepositorySI GetServiceForTest(Mock<IHttpContextAccessor> httpContextAccsessorMock)
        {
            IOptions<ServiceRepositorySettings> repoSettings = Options.Create(new ServiceRepositorySettings());
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(RepositorySITests).Assembly.Location).LocalPath);
            repoSettings.Value.RepositoryLocation = Path.Combine(unitTestFolder, @"..\..\..\_TestData\Repositories\");

            RepositorySI service = new RepositorySI(
                repoSettings,
                new Mock<IOptions<GeneralSettings>>().Object,
                new Mock<IDefaultFileFactory>().Object,
                httpContextAccsessorMock.Object,
                new Mock<IGitea>().Object,
                new Mock<ISourceControl>().Object,
                new Mock<ILoggerFactory>().Object,
                new Mock<ILogger<RepositorySI>>().Object);

            return service;
        }
    }
}

using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;

using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Models;
using Altinn.Studio.Designer.TypedHttpClients.AltinnStorage;

using AltinnCore.Authentication.Constants;

using Designer.Tests.Mocks;

using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

using Moq;

using Xunit;

using StorageInterface = Altinn.Platform.Storage.Interface.Models;

namespace Designer.Tests.TestingServices
{
    public class TextResourceServiceTest
    {
        [Fact]
        public async Task UpdateTextResourcesAsync_AllValidFiles_TwoTextResourcesAreCreatedInStorage()
        {
            // Arrange
            HttpContext httpContext = GetHttpContextForTestUser("testUser");
            Mock<IAltinnStorageTextResourceClient> storageClientMock = new Mock<IAltinnStorageTextResourceClient>();
            storageClientMock.Setup(s => s.Create(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<StorageInterface.TextResource>(), It.IsAny<EnvironmentModel>()))
                .Returns(Task.CompletedTask);
            storageClientMock.Setup(s => s.Get(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<EnvironmentModel>()))
              .Returns(Task.FromResult((StorageInterface.TextResource)null));

            TextResourceService sut = GetServiceForTest(storageClientMock);

            // Act
            await sut.UpdateTextResourcesAsync("ttd", "apps-test", "3e1099738e0d15490390a01c74b2abc16282d85f", null);

            // Assert
            storageClientMock.Verify(
                s =>
                s.Create(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<StorageInterface.TextResource>(), It.IsAny<EnvironmentModel>()),
                Times.Exactly(2));
        }

        [Fact]
        public async Task UpdateTextResourcesAsync_InvalidFileName_SingleTextResourcesAreCreatedInStorage()
        {
            // Arrange
            HttpContext httpContext = GetHttpContextForTestUser("testUser");
            Mock<IAltinnStorageTextResourceClient> storageClientMock = new Mock<IAltinnStorageTextResourceClient>();
            storageClientMock.Setup(s => s.Create(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<StorageInterface.TextResource>(), It.IsAny<EnvironmentModel>()))
                .Returns(Task.CompletedTask);
            storageClientMock.Setup(s => s.Get(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<EnvironmentModel>()))
              .Returns(Task.FromResult((StorageInterface.TextResource)null));

            TextResourceService sut = GetServiceForTest(storageClientMock);

            // Act
            await sut.UpdateTextResourcesAsync("ttd", "apps-test", "5e651c2b784571e481c90fbf26325ce336b634b8", null);

            // Assert
            storageClientMock.Verify(
                s =>
                s.Create(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<StorageInterface.TextResource>(), It.IsAny<EnvironmentModel>()),
                Times.Once);
        }

        [Fact]
        public async Task UpdateTextResourcesAsync_InvalidTextResource_NoTextResourceIsCreatedInStorage()
        {
            // Arrange
            HttpContext httpContext = GetHttpContextForTestUser("testUser");
            Mock<IAltinnStorageTextResourceClient> storageClientMock = new Mock<IAltinnStorageTextResourceClient>();
       
            storageClientMock.Setup(s => s.Get(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<EnvironmentModel>()))
              .Returns(Task.FromResult((StorageInterface.TextResource)null));

            TextResourceService sut = GetServiceForTest(storageClientMock);

            // Act
            await sut.UpdateTextResourcesAsync("ttd", "apps-test", "a69255710e6f1d1c59bef004dd36fff0c5dfd236", null);

            // Assert
            storageClientMock.Verify(
                s =>
                s.Create(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<StorageInterface.TextResource>(), It.IsAny<EnvironmentModel>()),
                Times.Never);
        }

        private HttpContext GetHttpContextForTestUser(string userName)
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

        private TextResourceService GetServiceForTest(Mock<IAltinnStorageTextResourceClient> storageClientMock = null)
        {
            storageClientMock ??= new Mock<IAltinnStorageTextResourceClient>();

            TextResourceService service = new TextResourceService(
               new IGiteaMock(),
               new Mock<ILogger<TextResourceService>>().Object,
               storageClientMock.Object);

            return service;
        }
    }
}

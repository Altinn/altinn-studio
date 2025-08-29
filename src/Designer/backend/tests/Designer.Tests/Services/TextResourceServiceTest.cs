using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;

using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.TypedHttpClients.AltinnStorage;

using AltinnCore.Authentication.Constants;

using Designer.Tests.Mocks;

using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

using Moq;

using Xunit;

using StorageInterface = Altinn.Platform.Storage.Interface.Models;

namespace Designer.Tests.Services
{
    public class TextResourceServiceTest
    {
        [Theory]
        [InlineData("ttd", "apps-test", "3e1099738e0d15490390a01c74b2abc16282d85f", 2)]
        [InlineData("ttd", "apps-test", "5e651c2b784571e481c90fbf26325ce336b634b8", 1)]
        public async Task UpdateTextResourcesAsync_ShouldCreateResources(string org, string app, string commitId, int numberOfUpsertedResources)
        {
            // Arrange
            Mock<IAltinnStorageTextResourceClient> storageClientMock = new();
            storageClientMock.Setup(s => s.Upsert(org, app, It.IsAny<StorageInterface.TextResource>(), It.IsAny<string>()))
                .Returns(Task.CompletedTask);

            TextResourceService sut = GetServiceForTest(storageClientMock);

            // Act
            await sut.UpdateTextResourcesAsync(org, app, commitId, null);

            // Assert
            storageClientMock.Verify(
                s =>
                s.Upsert(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<StorageInterface.TextResource>(), It.IsAny<string>()),
                Times.Exactly(numberOfUpsertedResources));
        }

        private static TextResourceService GetServiceForTest(Mock<IAltinnStorageTextResourceClient> storageClientMock = null)
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

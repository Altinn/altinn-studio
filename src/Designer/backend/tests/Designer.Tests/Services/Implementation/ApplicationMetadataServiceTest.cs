#nullable enable
using System;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.App;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.AltinnStorage;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit;

namespace Designer.Tests.Services.Implementation;

public class ApplicationMetadataServiceTest
{
    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task UpdateApplicationMetadataInStorageAsync_UpdatesJsonData_PassesPayloadToStorageClient(
        bool usePascalCasePropertyNames
    )
    {
        // Arrange
        var fixture = Fixture.Create();
        var appMetadata = new ApplicationMetadata("old-org/old-app");
        string? capturedAppMetadataJson = null;
        var jsonSerializerOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = usePascalCasePropertyNames ? JsonNamingPolicy.CamelCase : null
        };

        fixture
            .MockGiteaApiWrapper.Setup(x =>
                x.GetFileAsync(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>()
                )
            )
            .ReturnsAsync(Base64FileSystemObjectFactory(appMetadata, jsonSerializerOptions));

        fixture
            .MockStorageAppMetadataClient.Setup(x =>
                x.UpsertApplicationMetadata(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>()
                )
            )
            .Callback(
                (string org, string app, string applicationMetadataJson, string envName) =>
                {
                    capturedAppMetadataJson = applicationMetadataJson;
                }
            );

        // Act
        await fixture.Service.UpdateApplicationMetadataInStorageAsync(
            "new-org",
            "new-app",
            "abcd1234",
            "tt02",
            CancellationToken.None
        );

        // Assert
        var capturedAppMetadata = JsonSerializer.Deserialize<ApplicationMetadata>(
            capturedAppMetadataJson!,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true } // Simulate usage in AltinnStorageAppMetadataClient.GetApplicationMetadataAsync
        );
        Assert.NotNull(capturedAppMetadata);
        Assert.Equal("new-org/new-app", capturedAppMetadata.Id);
        Assert.Equal("abcd1234", capturedAppMetadata.VersionId);
    }

    private sealed record Fixture(
        ApplicationMetadataService ApplicationMetadataService,
        Mock<IAltinnStorageAppMetadataClient> MockStorageAppMetadataClient,
        Mock<IAltinnGitRepositoryFactory> MockAltinnGitRepositoryFactory,
        Mock<IGitea> MockGiteaApiWrapper
    )
    {
        public ApplicationMetadataService Service => ApplicationMetadataService;

        public static Fixture Create()
        {
            var mockStorageAppMetadataClient = new Mock<IAltinnStorageAppMetadataClient>();
            var mockAltinnGitRepositoryFactory = new Mock<IAltinnGitRepositoryFactory>();
            var mockGiteaApiWrapper = new Mock<IGitea>();

            var service = new ApplicationMetadataService(
                NullLogger<ApplicationMetadataService>.Instance,
                mockStorageAppMetadataClient.Object,
                mockAltinnGitRepositoryFactory.Object,
                Mock.Of<IHttpContextAccessor>(),
                mockGiteaApiWrapper.Object
            );

            return new Fixture(
                service,
                mockStorageAppMetadataClient,
                mockAltinnGitRepositoryFactory,
                mockGiteaApiWrapper
            );
        }
    }

    private FileSystemObject Base64FileSystemObjectFactory<T>(
        T content,
        JsonSerializerOptions? jsonSerializerOptions = null
    )
    {
        string serializedString = JsonSerializer.Serialize(content, jsonSerializerOptions);
        byte[] plainBytes = System.Text.Encoding.UTF8.GetBytes(serializedString);
        string base64String = Convert.ToBase64String(plainBytes);

        return new FileSystemObject
        {
            Content = base64String,
            Encoding = "base64",
            Type = "file"
        };
    }
}

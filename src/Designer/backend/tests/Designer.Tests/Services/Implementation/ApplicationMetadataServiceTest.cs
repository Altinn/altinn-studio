#nullable enable
using System;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Studio.Designer.Clients.Interfaces;
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
            PropertyNamingPolicy = usePascalCasePropertyNames ? JsonNamingPolicy.CamelCase : null,
        };

        fixture
            .MockGiteaClient.Setup(x =>
                x.GetFileAsync(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<CancellationToken>()
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
            AppStatus.UnderDevelopment,
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
        JsonNode? capturedJson = JsonNode.Parse(capturedAppMetadataJson!);
        string statusKey = usePascalCasePropertyNames ? "status" : "Status";
        Assert.Equal(nameof(AppStatus.UnderDevelopment), capturedJson?[statusKey]?.GetValue<string>());
    }

    private const string BaseCommitId = "eec136ac2d31cf984d2053df79f181b99c3b4db5";
    private const string StatusCommitId = "5b0e8d6f1c2a3b4c5d6e7f8091a2b3c4d5e6f708";
    private const string FileSha = "3f1c2a";
    private const string AppMetadataFilePath = "App/config/applicationmetadata.json";

    [Fact]
    public async Task CommitAppStatusAsync_CommitsStatusOnTopOfLatestCommit_AndKeepsTheRestOfTheFile()
    {
        // Arrange
        var fixture = Fixture.Create();
        const string AppMetadataJson = """
            {
              "id": "ttd/app",
              "title": {
                "nb": "Søknad"
              }
            }

            """;
        string? committedJson = null;
        SetupAppMetadataFile(fixture, AppMetadataJson);
        SetupLatestCommit(fixture, BaseCommitId);
        fixture
            .MockGiteaClient.Setup(x =>
                x.UpdateFileAsync(
                    "ttd",
                    "app",
                    AppMetadataFilePath,
                    It.IsAny<string>(),
                    FileSha,
                    "master",
                    It.IsAny<string>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback(
                (string _, string _, string _, string content, string _, string _, string _, CancellationToken _) =>
                    committedJson = content
            )
            .ReturnsAsync(StatusCommitId);

        // Act
        string commitId = await fixture.Service.CommitAppStatusAsync("ttd", "app", BaseCommitId, AppStatus.Completed);

        // Assert
        Assert.Equal(StatusCommitId, commitId);
        string expectedJson = """
            {
              "id": "ttd/app",
              "title": {
                "nb": "Søknad"
              },
              "status": "Completed"
            }

            """;
        Assert.Equal(expectedJson.ReplaceLineEndings("\n"), committedJson?.ReplaceLineEndings("\n"));
    }

    [Fact]
    public async Task CommitAppStatusAsync_WhenStatusIsAlreadyCommitted_ReturnsBaseCommitWithoutCommitting()
    {
        // Arrange
        var fixture = Fixture.Create();
        SetupAppMetadataFile(fixture, """{ "id": "ttd/app", "status": "Completed" }""");

        // Act
        string commitId = await fixture.Service.CommitAppStatusAsync("ttd", "app", BaseCommitId, AppStatus.Completed);

        // Assert
        Assert.Equal(BaseCommitId, commitId);
        VerifyNoFileUpdate(fixture);
    }

    [Fact]
    public async Task CommitAppStatusAsync_WhenBaseCommitIsNotLatest_ThrowsConflictWithoutCommitting()
    {
        // Arrange
        var fixture = Fixture.Create();
        SetupAppMetadataFile(fixture, """{ "id": "ttd/app", "status": "UnderDevelopment" }""");
        SetupLatestCommit(fixture, "0000000000000000000000000000000000000000");

        // Act
        var exception = await Assert.ThrowsAsync<Microsoft.Rest.TransientFaultHandling.HttpRequestWithStatusException>(
            () =>
                fixture.Service.CommitAppStatusAsync("ttd", "app", BaseCommitId, AppStatus.Completed)
        );

        // Assert
        Assert.Equal(System.Net.HttpStatusCode.Conflict, exception.StatusCode);
        VerifyNoFileUpdate(fixture);
    }

    private static void SetupAppMetadataFile(Fixture fixture, string appMetadataJson)
    {
        fixture
            .MockGiteaClient.Setup(x =>
                x.GetFileAsync("ttd", "app", AppMetadataFilePath, BaseCommitId, It.IsAny<CancellationToken>())
            )
            .ReturnsAsync(
                new FileSystemObject
                {
                    Content = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(appMetadataJson)),
                    Encoding = "base64",
                    Type = "file",
                    Sha = FileSha,
                }
            );
    }

    private static void SetupLatestCommit(Fixture fixture, string commitId)
    {
        fixture
            .MockGiteaClient.Setup(x =>
                x.GetLatestCommitOnBranch("ttd", "app", "master", It.IsAny<CancellationToken>())
            )
            .ReturnsAsync(commitId);
    }

    private static void VerifyNoFileUpdate(Fixture fixture)
    {
        fixture.MockGiteaClient.Verify(
            x =>
                x.UpdateFileAsync(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
    }

    private sealed record Fixture(
        ApplicationMetadataService ApplicationMetadataService,
        Mock<IAltinnStorageAppMetadataClient> MockStorageAppMetadataClient,
        Mock<IAltinnGitRepositoryFactory> MockAltinnGitRepositoryFactory,
        Mock<IGiteaClient> MockGiteaClient
    )
    {
        public ApplicationMetadataService Service => ApplicationMetadataService;

        public static Fixture Create()
        {
            var mockStorageAppMetadataClient = new Mock<IAltinnStorageAppMetadataClient>();
            var mockAltinnGitRepositoryFactory = new Mock<IAltinnGitRepositoryFactory>();
            var mockGiteaClient = new Mock<IGiteaClient>();

            var service = new ApplicationMetadataService(
                NullLogger<ApplicationMetadataService>.Instance,
                mockStorageAppMetadataClient.Object,
                mockAltinnGitRepositoryFactory.Object,
                Mock.Of<IHttpContextAccessor>(),
                mockGiteaClient.Object
            );

            return new Fixture(service, mockStorageAppMetadataClient, mockAltinnGitRepositoryFactory, mockGiteaClient);
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
            Type = "file",
        };
    }
}

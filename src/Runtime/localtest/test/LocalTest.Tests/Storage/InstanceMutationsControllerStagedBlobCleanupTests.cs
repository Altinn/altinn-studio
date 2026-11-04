using System.Security.Claims;
using System.Text;
using Altinn.Platform.Storage.Authorization;
using Altinn.Platform.Storage.Clients;
using Altinn.Platform.Storage.Configuration;
using Altinn.Platform.Storage.Controllers;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;
using Altinn.Platform.Storage.Services;
using AltinnCore.Authentication.Constants;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Moq;
using Newtonsoft.Json;
using Xunit;

namespace LocalTest.Tests.Storage;

public sealed class InstanceMutationsControllerStagedBlobCleanupTests
{
    private const string DataTypeId = "attachment";
    private const string Boundary = "mutation-boundary";

    [Fact]
    public async Task CommitMutation_CancelledAfterBlobIsStaged_DeletesStagedBlob()
    {
        await using LocalStorageFixture storage = new();
        Instance instance = await storage.CreateInstance();
        var authorization = new Mock<IAuthorization>();
        authorization
            .SetupSequence(service =>
                service.AuthorizeInstanceAction(It.IsAny<Instance>(), "write", It.IsAny<string>())
            )
            .ReturnsAsync(true)
            .ThrowsAsync(new OperationCanceledException());
        Mock<IBlobRepository> blobRepository = CreateBlobRepository(out List<string> writtenPaths);
        InstanceMutationsController controller = CreateController(
            storage,
            authorization.Object,
            blobRepository.Object,
            storage.MutationRepository
        );

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            controller.CommitMutation(501337, InstanceGuid(instance), CancellationToken.None)
        );

        string stagedPath = Assert.Single(writtenPaths);
        blobRepository.Verify(
            repository => repository.DeleteBlob(instance.Org, stagedPath, It.IsAny<int?>()),
            Times.Once
        );
    }

    [Fact]
    public async Task CommitMutation_ApplyThrowsUnexpectedly_KeepsStagedBlobs()
    {
        await using LocalStorageFixture storage = new();
        Instance instance = await storage.CreateInstance();
        var authorization = new Mock<IAuthorization>();
        authorization
            .Setup(service =>
                service.AuthorizeInstanceAction(It.IsAny<Instance>(), "write", It.IsAny<string>())
            )
            .ReturnsAsync(true);
        Mock<IBlobRepository> blobRepository = CreateBlobRepository(out List<string> writtenPaths);
        // An unexpected failure from Apply may come after the mutation committed, so the staged
        // blobs can already be referenced by data elements and must not be deleted.
        var mutationRepository = new Mock<IInstanceMutationRepository>();
        mutationRepository
            .Setup(repository =>
                repository.Apply(
                    It.IsAny<Guid>(),
                    It.IsAny<long>(),
                    It.IsAny<InstanceMutationCommit>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(new OperationCanceledException());
        InstanceMutationsController controller = CreateController(
            storage,
            authorization.Object,
            blobRepository.Object,
            mutationRepository.Object
        );

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            controller.CommitMutation(501337, InstanceGuid(instance), CancellationToken.None)
        );

        Assert.Equal(2, writtenPaths.Count);
        blobRepository.Verify(
            repository =>
                repository.DeleteBlob(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int?>()),
            Times.Never
        );
    }

    private static Mock<IBlobRepository> CreateBlobRepository(out List<string> writtenPaths)
    {
        List<string> paths = [];
        var blobRepository = new Mock<IBlobRepository>();
        blobRepository
            .Setup(repository =>
                repository.WriteBlob(
                    It.IsAny<string>(),
                    It.IsAny<Stream>(),
                    It.IsAny<string>(),
                    It.IsAny<int?>()
                )
            )
            .Callback(
                (string _, Stream _, string blobStoragePath, int? _) => paths.Add(blobStoragePath)
            )
            .ReturnsAsync((4L, DateTimeOffset.UtcNow));
        blobRepository
            .Setup(repository =>
                repository.DeleteBlob(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int?>())
            )
            .ReturnsAsync(true);
        writtenPaths = paths;
        return blobRepository;
    }

    private static Guid InstanceGuid(Instance instance) => Guid.Parse(instance.Id.Split('/')[1]);

    private static InstanceMutationsController CreateController(
        LocalStorageFixture storage,
        IAuthorization authorization,
        IBlobRepository blobRepository,
        IInstanceMutationRepository mutationRepository
    )
    {
        var applicationRepository = new Mock<IApplicationRepository>();
        applicationRepository
            .Setup(repository =>
                repository.FindOne(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                new Application
                {
                    Id = "ttd/localtest-content-etag-tests",
                    Org = "ttd",
                    DataTypes = [new DataType { Id = DataTypeId, ActionRequiredToWrite = "write" }],
                }
            );
        IOptions<GeneralSettings> settings = Options.Create(
            new GeneralSettings { Hostname = "localhost" }
        );

        var httpContext = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(
                new ClaimsIdentity([new Claim(AltinnCoreClaimTypes.UserId, "1337")], "test")
            ),
        };
        httpContext.Request.ContentType = $"multipart/form-data; boundary={Boundary}";
        httpContext.Request.Body = new MemoryStream(CreateTwoAttachmentsBody());

        return new InstanceMutationsController(
            storage.DataRepository,
            blobRepository,
            storage.InstanceRepository,
            mutationRepository,
            applicationRepository.Object,
            Mock.Of<IDataService>(),
            Mock.Of<IInstanceEventService>(),
            settings,
            authorization,
            Mock.Of<Microsoft.AspNetCore.Authorization.IAuthorizationService>(),
            new ProcessAuthorizer(authorization, settings)
        )
        {
            ControllerContext = new ControllerContext { HttpContext = httpContext },
        };
    }

    private static byte[] CreateTwoAttachmentsBody()
    {
        var mutation = new InstanceMutationRequest
        {
            CreateDataElements =
            [
                new InstanceMutationCreateDataElement
                {
                    DataType = DataTypeId,
                    ContentPartName = "first",
                },
                new InstanceMutationCreateDataElement
                {
                    DataType = DataTypeId,
                    ContentPartName = "second",
                },
            ],
        };

        var body = new StringBuilder();
        AppendPart(body, "mutation", "application/json", JsonConvert.SerializeObject(mutation));
        AppendPart(body, "first", "text/plain", "data");
        AppendPart(body, "second", "text/plain", "data");
        body.Append($"--{Boundary}--\r\n");
        return Encoding.UTF8.GetBytes(body.ToString());
    }

    private static void AppendPart(
        StringBuilder body,
        string name,
        string contentType,
        string content
    )
    {
        body.Append($"--{Boundary}\r\n");
        body.Append(
            $"Content-Disposition: form-data; name=\"{name}\"; filename=\"{name}.txt\"\r\n"
        );
        body.Append($"Content-Type: {contentType}\r\n\r\n");
        body.Append(content);
        body.Append("\r\n");
    }
}

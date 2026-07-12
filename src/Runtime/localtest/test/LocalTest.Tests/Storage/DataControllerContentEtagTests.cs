using System.Security.Claims;
using Altinn.Platform.Storage.Authorization;
using Altinn.Platform.Storage.Clients;
using Altinn.Platform.Storage.Configuration;
using Altinn.Platform.Storage.Controllers;
using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;
using Altinn.Platform.Storage.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Microsoft.Net.Http.Headers;
using Moq;
using Xunit;

namespace LocalTest.Tests.Storage;

public sealed class DataControllerContentEtagTests
{
    [Fact]
    public async Task Get_WithMatchingIfMatch_ReturnsContentAndEtag()
    {
        await using ControllerFixture fixture = await ControllerFixture.Create(
            withBlobVersion: true
        );
        fixture.Controller.Request.Headers[HeaderNames.IfMatch] = fixture.ContentEtag;

        ActionResult result = await fixture.Controller.Get(
            fixture.PartyId,
            fixture.InstanceGuid,
            fixture.DataElementId,
            CancellationToken.None
        );

        Assert.IsType<FileStreamResult>(result);
        Assert.Equal(fixture.ContentEtag, fixture.Controller.Response.Headers.ETag);
        fixture.BlobRepository.Verify(
            repository =>
                repository.ReadBlob(
                    fixture.Instance.Org,
                    fixture.DataElement.BlobStoragePath,
                    null,
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task Get_WithoutIfMatch_RemainsUnconditioned()
    {
        await using ControllerFixture fixture = await ControllerFixture.Create(
            withBlobVersion: true
        );

        ActionResult result = await fixture.Controller.Get(
            fixture.PartyId,
            fixture.InstanceGuid,
            fixture.DataElementId,
            CancellationToken.None
        );

        Assert.IsType<FileStreamResult>(result);
        Assert.Equal(fixture.ContentEtag, fixture.Controller.Response.Headers.ETag);
        fixture.BlobRepository.Verify(
            repository =>
                repository.ReadBlob(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<int?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task Get_WithoutIfMatchAndWithoutCurrentBlobVersion_ReturnsLegacyContentWithoutEtag()
    {
        await using ControllerFixture fixture = await ControllerFixture.Create(
            withBlobVersion: false,
            isRead: false
        );

        ActionResult result = await fixture.Controller.Get(
            fixture.PartyId,
            fixture.InstanceGuid,
            fixture.DataElementId,
            CancellationToken.None
        );

        Assert.IsType<FileStreamResult>(result);
        Assert.False(fixture.Controller.Response.Headers.ContainsKey(HeaderNames.ETag));
        DataElement stored = await fixture.Storage.DataRepository.Read(
            fixture.InstanceGuid,
            fixture.DataElementId
        );
        Assert.True(stored.IsRead);
        fixture.BlobRepository.Verify(
            repository =>
                repository.ReadBlob(
                    fixture.Instance.Org,
                    fixture.DataElement.BlobStoragePath,
                    null,
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task Get_ContentVersionChangesAfterSnapshot_UsesCapturedVersionForConditionPathAndEtag()
    {
        await using ControllerFixture fixture = await ControllerFixture.Create(
            withBlobVersion: true
        );
        string capturedContentEtag = fixture.ContentEtag;
        string capturedBlobStoragePath = fixture.DataElement.BlobStoragePath;
        string nextBlobVersion = await fixture.Storage.DataRepository.CreateBlobVersionId(
            fixture.InstanceGuid,
            fixture.DataElementId,
            fixture.Instance.AppId,
            fixture.Instance.Org,
            storageAccountNumber: null
        );
        fixture
            .ApplicationRepository.Setup(repository =>
                repository.FindOne(
                    fixture.Instance.AppId,
                    fixture.Instance.Org,
                    It.IsAny<CancellationToken>()
                )
            )
            .Returns(async () =>
            {
                await fixture.Storage.DataRepository.Update(
                    fixture.InstanceGuid,
                    fixture.DataElementId,
                    new Dictionary<string, object>
                    {
                        ["/blobStoragePath"] = BlobRepository.GetVersionedBlobPath(
                            fixture.Instance.AppId,
                            fixture.InstanceGuid.ToString(),
                            nextBlobVersion
                        ),
                        ["/currentBlobVersion"] = nextBlobVersion,
                    }
                );
                return fixture.Application;
            });
        fixture.Controller.Request.Headers[HeaderNames.IfMatch] = capturedContentEtag;

        ActionResult result = await fixture.Controller.Get(
            fixture.PartyId,
            fixture.InstanceGuid,
            fixture.DataElementId,
            CancellationToken.None
        );

        Assert.IsType<FileStreamResult>(result);
        Assert.Equal(capturedContentEtag, fixture.Controller.Response.Headers.ETag);
        Assert.Equal(
            nextBlobVersion,
            await fixture.Storage.DataRepository.ReadCurrentBlobVersion(
                fixture.InstanceGuid,
                fixture.DataElementId
            )
        );
        fixture.BlobRepository.Verify(
            repository =>
                repository.ReadBlob(
                    fixture.Instance.Org,
                    capturedBlobStoragePath,
                    null,
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task Get_WithStaleIfMatch_ReturnsPreconditionFailedWithoutSideEffects()
    {
        await using ControllerFixture fixture = await ControllerFixture.Create(
            withBlobVersion: true,
            isRead: false
        );
        fixture.Controller.Request.Headers[HeaderNames.IfMatch] = $"\"{NewBlobVersionId()}\"";

        ActionResult result = await fixture.Controller.Get(
            fixture.PartyId,
            fixture.InstanceGuid,
            fixture.DataElementId,
            CancellationToken.None
        );

        StatusCodeResult status = Assert.IsType<StatusCodeResult>(result);
        Assert.Equal(StatusCodes.Status412PreconditionFailed, status.StatusCode);
        Assert.Empty(fixture.Controller.Response.Headers);
        DataElement stored = await fixture.Storage.DataRepository.Read(
            fixture.InstanceGuid,
            fixture.DataElementId
        );
        Assert.False(stored.IsRead);
        fixture.BlobRepository.Verify(
            repository =>
                repository.ReadBlob(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<int?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
    }

    [Fact]
    public async Task Get_WithIfMatchAndNoCurrentBlobVersion_ReturnsPreconditionFailed()
    {
        await using ControllerFixture fixture = await ControllerFixture.Create(
            withBlobVersion: false,
            isRead: false
        );
        fixture.Controller.Request.Headers[HeaderNames.IfMatch] = $"\"{NewBlobVersionId()}\"";

        ActionResult result = await fixture.Controller.Get(
            fixture.PartyId,
            fixture.InstanceGuid,
            fixture.DataElementId,
            CancellationToken.None
        );

        StatusCodeResult status = Assert.IsType<StatusCodeResult>(result);
        Assert.Equal(StatusCodes.Status412PreconditionFailed, status.StatusCode);
        Assert.Empty(fixture.Controller.Response.Headers);
        DataElement stored = await fixture.Storage.DataRepository.Read(
            fixture.InstanceGuid,
            fixture.DataElementId
        );
        Assert.False(stored.IsRead);
        fixture.BlobRepository.Verify(
            repository =>
                repository.ReadBlob(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<int?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
    }

    [Theory]
    [InlineData("weak")]
    [InlineData("multiple")]
    [InlineData("wildcard")]
    [InlineData("invalid-value")]
    [InlineData("malformed")]
    public async Task Get_WithMalformedIfMatch_ReturnsBadRequest(string variant)
    {
        await using ControllerFixture fixture = await ControllerFixture.Create(
            withBlobVersion: true,
            isRead: false
        );
        string validTag = fixture.ContentEtag;
        fixture.Controller.Request.Headers[HeaderNames.IfMatch] = variant switch
        {
            "weak" => $"W/{validTag}",
            "multiple" => $"{validTag}, {validTag}",
            "wildcard" => "*",
            "invalid-value" => "\"not-a-blob-version\"",
            _ => "not-an-etag",
        };

        ActionResult result = await fixture.Controller.Get(
            fixture.PartyId,
            fixture.InstanceGuid,
            fixture.DataElementId,
            CancellationToken.None
        );

        Assert.IsType<BadRequestObjectResult>(result);
        Assert.Empty(fixture.Controller.Response.Headers);
        DataElement stored = await fixture.Storage.DataRepository.Read(
            fixture.InstanceGuid,
            fixture.DataElementId
        );
        Assert.False(stored.IsRead);
        fixture.BlobRepository.Verify(
            repository =>
                repository.ReadBlob(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<int?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
    }

    [Fact]
    public async Task Get_WhenReadIsDenied_ReturnsForbidBeforeMalformedIfMatchWithoutSideEffects()
    {
        await using ControllerFixture fixture = await ControllerFixture.Create(
            withBlobVersion: true,
            isRead: false,
            authorizeRead: false
        );
        fixture.Controller.Request.Headers[HeaderNames.IfMatch] = "not-an-etag";

        ActionResult result = await fixture.Controller.Get(
            fixture.PartyId,
            fixture.InstanceGuid,
            fixture.DataElementId,
            CancellationToken.None
        );

        Assert.IsType<ForbidResult>(result);
        Assert.Empty(fixture.Controller.Response.Headers);
        DataElement stored = await fixture.Storage.DataRepository.Read(
            fixture.InstanceGuid,
            fixture.DataElementId
        );
        Assert.False(stored.IsRead);
        fixture.BlobRepository.Verify(
            repository =>
                repository.ReadBlob(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<int?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
        fixture.Authorization.Verify(
            authorization =>
                authorization.AuthorizeInstanceAction(
                    It.IsAny<Instance>(),
                    "read",
                    It.IsAny<string>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task Get_HardDeletedElementForNonOwner_ReturnsNotFoundBeforeIfMatchValidation()
    {
        await using ControllerFixture fixture = await ControllerFixture.Create(
            withBlobVersion: true,
            hardDeleted: true
        );
        fixture.Controller.Request.Headers[HeaderNames.IfMatch] = "not-an-etag";

        ActionResult result = await fixture.Controller.Get(
            fixture.PartyId,
            fixture.InstanceGuid,
            fixture.DataElementId,
            CancellationToken.None
        );

        Assert.IsType<NotFoundResult>(result);
        fixture.BlobRepository.Verify(
            repository =>
                repository.ReadBlob(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<int?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
    }

    private static string NewBlobVersionId() =>
        Convert
            .ToBase64String(Guid.NewGuid().ToByteArray())
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');

    private sealed class ControllerFixture : IAsyncDisposable
    {
        private ControllerFixture(
            LocalStorageFixture storage,
            Instance instance,
            DataElement dataElement,
            Mock<IBlobRepository> blobRepository,
            Mock<IApplicationRepository> applicationRepository,
            Mock<IAuthorization> authorization,
            Application application,
            DataController controller
        )
        {
            Storage = storage;
            Instance = instance;
            DataElement = dataElement;
            BlobRepository = blobRepository;
            ApplicationRepository = applicationRepository;
            Authorization = authorization;
            Application = application;
            Controller = controller;
        }

        public LocalStorageFixture Storage { get; }

        public Instance Instance { get; }

        public DataElement DataElement { get; }

        public Mock<IBlobRepository> BlobRepository { get; }

        public Mock<IApplicationRepository> ApplicationRepository { get; }

        public Mock<IAuthorization> Authorization { get; }

        public Application Application { get; }

        public DataController Controller { get; }

        public int PartyId => int.Parse(Instance.InstanceOwner.PartyId);

        public Guid InstanceGuid => Guid.Parse(Instance.Id.Split('/')[1]);

        public Guid DataElementId => Guid.Parse(DataElement.Id);

        public string ContentEtag => DataElement.ContentEtag!;

        public static async Task<ControllerFixture> Create(
            bool withBlobVersion,
            bool isRead = true,
            bool hardDeleted = false,
            bool authorizeRead = true
        )
        {
            var storage = new LocalStorageFixture();
            Instance instance = await storage.CreateInstance();
            Guid instanceGuid = Guid.Parse(instance.Id.Split('/')[1]);
            Guid dataElementId = Guid.NewGuid();
            string? blobVersionId = withBlobVersion
                ? await storage.DataRepository.CreateBlobVersionId(
                    instanceGuid,
                    dataElementId,
                    instance.AppId,
                    instance.Org,
                    storageAccountNumber: null
                )
                : null;
            string blobStoragePath = withBlobVersion
                ? Altinn.Platform.Storage.Repository.BlobRepository.GetVersionedBlobPath(
                    instance.AppId,
                    instanceGuid.ToString(),
                    blobVersionId!
                )
                : DataElementHelper.DataFileName(
                    instance.AppId,
                    instanceGuid.ToString(),
                    dataElementId.ToString()
                );
            DataElement dataElement = (
                await storage.DataRepository.Create(
                    new DataElement
                    {
                        Id = dataElementId.ToString(),
                        InstanceGuid = instanceGuid.ToString(),
                        DataType = "attachment",
                        Filename = "attachment.txt",
                        ContentType = "text/plain",
                        BlobStoragePath = blobStoragePath,
                        IsRead = isRead,
                        DeleteStatus = hardDeleted
                            ? new DeleteStatus
                            {
                                IsHardDeleted = true,
                                HardDeleted = DateTime.UtcNow,
                            }
                            : null,
                        Created = DateTime.UtcNow,
                        LastChanged = DateTime.UtcNow,
                    }
                )
            ).DataElement;

            var blobRepository = new Mock<IBlobRepository>();
            blobRepository
                .Setup(repository =>
                    repository.ReadBlob(
                        It.IsAny<string>(),
                        It.IsAny<string>(),
                        It.IsAny<int?>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(() => new MemoryStream("content"u8.ToArray()));
            var applicationRepository = new Mock<IApplicationRepository>();
            var application = new Application
            {
                Id = instance.AppId,
                Org = instance.Org,
                DataTypes =
                [
                    new DataType
                    {
                        Id = dataElement.DataType,
                        ActionRequiredToRead = authorizeRead ? null : "read",
                    },
                ],
            };
            applicationRepository
                .Setup(repository =>
                    repository.FindOne(instance.AppId, instance.Org, It.IsAny<CancellationToken>())
                )
                .ReturnsAsync(application);
            var authorization = new Mock<IAuthorization>();
            authorization
                .Setup(service =>
                    service.AuthorizeInstanceAction(
                        It.IsAny<Instance>(),
                        It.IsAny<string>(),
                        It.IsAny<string>()
                    )
                )
                .ReturnsAsync(authorizeRead);
            var controller = new DataController(
                storage.DataRepository,
                blobRepository.Object,
                storage.InstanceRepository,
                applicationRepository.Object,
                Mock.Of<IDataService>(),
                Mock.Of<IInstanceEventService>(),
                Options.Create(new GeneralSettings { Hostname = "localhost" }),
                Mock.Of<IOnDemandClient>(),
                authorization.Object
            )
            {
                ControllerContext = new ControllerContext
                {
                    HttpContext = new DefaultHttpContext
                    {
                        User = new ClaimsPrincipal(new ClaimsIdentity()),
                    },
                },
            };

            return new ControllerFixture(
                storage,
                instance,
                dataElement,
                blobRepository,
                applicationRepository,
                authorization,
                application,
                controller
            );
        }

        public ValueTask DisposeAsync() => Storage.DisposeAsync();
    }
}

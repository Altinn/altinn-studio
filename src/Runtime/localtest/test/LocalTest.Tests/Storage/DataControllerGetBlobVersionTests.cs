using System.Security.Claims;
using System.Text;
using Altinn.Platform.Storage.Authorization;
using Altinn.Platform.Storage.Clients;
using Altinn.Platform.Storage.Configuration;
using Altinn.Platform.Storage.Controllers;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Models;
using Altinn.Platform.Storage.Repository;
using Altinn.Platform.Storage.Services;
using AltinnCore.Authentication.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Microsoft.Net.Http.Headers;
using Moq;
using Newtonsoft.Json;
using Xunit;

namespace LocalTest.Tests.Storage;

public sealed class DataControllerGetBlobVersionTests
{
    private const string DataTypeId = "attachment";
    private const string AppOwner = "ttd";
    private const string ReadAction = "restricted-read";

    [Fact]
    public async Task GetBlobVersion_AfterAnAggregateMutationDeletedTheElement_ReturnsItsContent()
    {
        await using var storage = new LocalStorageFixture();
        Instance instance = await storage.CreateInstance();
        DataElement created = await Create(storage, instance, "first");
        await Commit(storage, instance, Delete(created));
        Assert.Empty(await storage.DataRepository.ReadAll(InstanceGuid(instance)));

        ActionResult result = await GetBlobVersion(storage, instance, created, created.BlobVersionId);

        await AssertContent(result, "first");
    }

    [Fact]
    public async Task GetBlobVersion_AfterAnAggregateMutationReplacedTheContent_ReturnsEitherVersion()
    {
        await using var storage = new LocalStorageFixture();
        Instance instance = await storage.CreateInstance();
        DataElement created = await Create(storage, instance, "first");
        InstanceMutationResponse replaced = await Commit(
            storage,
            instance,
            new InstanceMutationRequest
            {
                UpdateDataElements =
                [
                    new InstanceMutationUpdateDataElement
                    {
                        DataElementId = Guid.Parse(created.Id),
                        ContentPartName = "replacement",
                    },
                ],
            },
            ("replacement", "second")
        );
        string currentBlobVersion = Assert.Single(replaced.Instance.Data).BlobVersionId;
        Assert.NotEqual(created.BlobVersionId, currentBlobVersion);

        await AssertContent(
            await GetBlobVersion(storage, instance, created, created.BlobVersionId),
            "first"
        );
        await AssertContent(
            await GetBlobVersion(storage, instance, created, currentBlobVersion),
            "second"
        );
    }

    [Fact]
    public async Task GetBlobVersion_AfterAnAggregateMutationDeletedAReplacedElement_ReturnsEveryVersion()
    {
        await using var storage = new LocalStorageFixture();
        Instance instance = await storage.CreateInstance();
        DataElement created = await Create(storage, instance, "first");
        InstanceMutationResponse replaced = await Commit(
            storage,
            instance,
            new InstanceMutationRequest
            {
                UpdateDataElements =
                [
                    new InstanceMutationUpdateDataElement
                    {
                        DataElementId = Guid.Parse(created.Id),
                        ContentPartName = "replacement",
                    },
                ],
            },
            ("replacement", "second")
        );
        string lastBlobVersion = Assert.Single(replaced.Instance.Data).BlobVersionId;
        await Commit(storage, instance, Delete(created));

        await AssertContent(
            await GetBlobVersion(storage, instance, created, created.BlobVersionId),
            "first"
        );
        await AssertContent(
            await GetBlobVersion(storage, instance, created, lastBlobVersion),
            "second"
        );
    }

    [Fact]
    public async Task Get_AfterAnAggregateMutationDeletedTheElement_ReturnsNotFound()
    {
        await using var storage = new LocalStorageFixture();
        Instance instance = await storage.CreateInstance();
        DataElement created = await Create(storage, instance, "first");
        await Commit(storage, instance, Delete(created));
        DataController controller = CreateDataController(storage, AppOwner);
        controller.Request.Headers[HeaderNames.IfMatch] = BlobVersionId.ToETag(
            created.BlobVersionId
        );

        ActionResult result = await controller.Get(
            PartyId(instance),
            InstanceGuid(instance),
            Guid.Parse(created.Id),
            CancellationToken.None
        );

        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task GetBlobVersion_UnknownVersion_ReturnsNotFound()
    {
        await using var storage = new LocalStorageFixture();
        Instance instance = await storage.CreateInstance();
        DataElement created = await Create(storage, instance, "first");
        DataElement other = await Create(storage, instance, "other");

        Assert.IsType<NotFoundObjectResult>(
            await GetBlobVersion(
                storage,
                instance,
                created,
                BlobVersionId.Encode(Guid.NewGuid())
            )
        );
        Assert.IsType<NotFoundObjectResult>(
            await GetBlobVersion(storage, instance, created, other.BlobVersionId)
        );
        Assert.IsType<NotFoundObjectResult>(
            await GetBlobVersion(storage, instance, created, "../" + created.BlobVersionId)
        );
    }

    [Fact]
    public async Task GetBlobVersion_UnknownInstance_ReturnsNotFound()
    {
        await using var storage = new LocalStorageFixture();
        Instance instance = await storage.CreateInstance();
        DataElement created = await Create(storage, instance, "first");

        ActionResult result = await CreateDataController(storage, AppOwner)
            .GetBlobVersion(
                PartyId(instance),
                Guid.NewGuid(),
                Guid.Parse(created.Id),
                created.BlobVersionId,
                CancellationToken.None
            );

        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task GetBlobVersion_AfterAStandaloneDeleteOfTheElement_ReturnsNotFound()
    {
        await using var storage = new LocalStorageFixture();
        Instance instance = await storage.CreateInstance();
        DataElement created = await Create(storage, instance, "first");
        ActionResult<DataElement> deleted = await CreateDataController(storage, AppOwner)
            .Delete(
                PartyId(instance),
                InstanceGuid(instance),
                Guid.Parse(created.Id),
                delay: false,
                CancellationToken.None
            );
        Assert.IsType<OkObjectResult>(deleted.Result);

        ActionResult result = await GetBlobVersion(storage, instance, created, created.BlobVersionId);

        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("other")]
    public async Task GetBlobVersion_FromAnyoneButTheServiceOwner_ReturnsForbid(string? org)
    {
        await using var storage = new LocalStorageFixture();
        Instance instance = await storage.CreateInstance();
        DataElement created = await Create(storage, instance, "first");

        ActionResult result = await GetBlobVersion(
            storage,
            instance,
            created,
            created.BlobVersionId,
            org
        );

        Assert.IsType<ForbidResult>(result);
    }

    [Fact]
    public async Task GetBlobVersion_WithoutReadAccessToTheInstance_ReturnsForbid()
    {
        await using var storage = new LocalStorageFixture();
        Instance instance = await storage.CreateInstance();
        DataElement created = await Create(storage, instance, "first");

        ActionResult result = await GetBlobVersion(
            storage,
            instance,
            created,
            created.BlobVersionId,
            denyInstanceRead: true
        );

        Assert.IsType<ForbidResult>(result);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task GetBlobVersion_WithoutReadAccessToTheDataType_ReturnsForbid(bool elementDeleted)
    {
        await using var storage = new LocalStorageFixture();
        Instance instance = await storage.CreateInstance();
        DataElement created = await Create(storage, instance, "first");
        if (elementDeleted)
        {
            await Commit(storage, instance, Delete(created));
        }

        ActionResult result = await GetBlobVersion(
            storage,
            instance,
            created,
            created.BlobVersionId,
            denyRead: true
        );

        Assert.IsType<ForbidResult>(result);
    }

    private static InstanceMutationRequest Delete(DataElement dataElement) =>
        new()
        {
            DeleteDataElements =
            [
                new InstanceMutationDeleteDataElement { DataElementId = Guid.Parse(dataElement.Id) },
            ],
        };

    private static async Task<DataElement> Create(
        LocalStorageFixture storage,
        Instance instance,
        string content
    )
    {
        InstanceMutationResponse response = await Commit(
            storage,
            instance,
            new InstanceMutationRequest
            {
                CreateDataElements =
                [
                    new InstanceMutationCreateDataElement
                    {
                        DataType = DataTypeId,
                        ContentPartName = "created",
                    },
                ],
            },
            ("created", content)
        );
        string createdId = Assert.Single(response.CreatedDataElementIds);
        return response.Instance.Data.Single(dataElement => dataElement.Id == createdId);
    }

    private static Task<ActionResult> GetBlobVersion(
        LocalStorageFixture storage,
        Instance instance,
        DataElement dataElement,
        string blobVersionId,
        string? org = AppOwner,
        bool denyRead = false,
        bool denyInstanceRead = false
    ) =>
        CreateDataController(storage, org, denyRead, denyInstanceRead)
            .GetBlobVersion(
                PartyId(instance),
                InstanceGuid(instance),
                Guid.Parse(dataElement.Id),
                blobVersionId,
                CancellationToken.None
            );

    private static async Task AssertContent(ActionResult result, string expected)
    {
        FileStreamResult file = Assert.IsType<FileStreamResult>(result);
        Assert.Equal("application/octet-stream", file.ContentType);
        using var reader = new StreamReader(file.FileStream);
        Assert.Equal(expected, await reader.ReadToEndAsync());
    }

    private static int PartyId(Instance instance) => int.Parse(instance.InstanceOwner.PartyId);

    private static Guid InstanceGuid(Instance instance) => Guid.Parse(instance.Id.Split('/')[1]);

    private static ClaimsPrincipal User(string? org) =>
        new(
            new ClaimsIdentity(
                org is null
                    ? [new Claim(AltinnCoreClaimTypes.UserId, "1337")]
                    :
                    [
                        new Claim(AltinnCoreClaimTypes.Org, org),
                        new Claim(AltinnCoreClaimTypes.OrgNumber, "991825827"),
                    ],
                "test"
            )
        );

    private static IApplicationRepository ApplicationRepository(bool denyRead)
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
                    Org = AppOwner,
                    DataTypes =
                    [
                        new DataType
                        {
                            Id = DataTypeId,
                            ActionRequiredToRead = denyRead ? ReadAction : null,
                        },
                    ],
                }
            );
        return applicationRepository.Object;
    }

    // Answers the read of the instance, denies the read action of the data type and fails on any other call.
    private static IAuthorization Authorization(bool denyInstanceRead = false)
    {
        var authorization = new Mock<IAuthorization>(MockBehavior.Strict);
        authorization
            .Setup(service =>
                service.AuthorizeInstanceAction(
                    It.IsAny<Instance>(),
                    "read",
                    It.IsAny<string>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(!denyInstanceRead);
        authorization
            .Setup(service =>
                service.AuthorizeInstanceAction(
                    It.IsAny<Instance>(),
                    ReadAction,
                    It.IsAny<string>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(false);
        return authorization.Object;
    }

    private static IInstanceEventService InstanceEventService() =>
        Mock.Of<IInstanceEventService>(service =>
            service.BuildInstanceEvent(
                It.IsAny<InstanceEventType>(),
                It.IsAny<Instance>(),
                It.IsAny<DataElement>()
            ) == new InstanceEvent()
        );

    private static DataService CreateDataService(LocalStorageFixture storage) =>
        new(
            storage.DataRepository,
            new BlobRepository(Options.Create(storage.Settings)),
            InstanceEventService(),
            storage.MutationRepository,
            storage.InstanceRepository
        );

    private static DataController CreateDataController(
        LocalStorageFixture storage,
        string? org,
        bool denyRead = false,
        bool denyInstanceRead = false
    ) =>
        new(
            storage.DataRepository,
            new BlobRepository(Options.Create(storage.Settings)),
            storage.InstanceRepository,
            ApplicationRepository(denyRead),
            CreateDataService(storage),
            Mock.Of<IInstanceEventService>(),
            Options.Create(new GeneralSettings { Hostname = "localhost" }),
            Mock.Of<IOnDemandClient>(),
            Authorization(denyInstanceRead)
        )
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = User(org) },
            },
        };

    private static async Task<InstanceMutationResponse> Commit(
        LocalStorageFixture storage,
        Instance instance,
        InstanceMutationRequest request,
        params (string PartName, string Content)[] contentParts
    )
    {
        IOptions<GeneralSettings> settings = Options.Create(
            new GeneralSettings { Hostname = "localhost" }
        );
        var httpContext = new DefaultHttpContext { User = User(AppOwner) };
        string mutationJson = JsonConvert.SerializeObject(request);
        if (contentParts.Length == 0)
        {
            httpContext.Request.ContentType = "application/json";
            httpContext.Request.Body = new MemoryStream(Encoding.UTF8.GetBytes(mutationJson));
        }
        else
        {
            using var content = new MultipartFormDataContent();
            content.Add(
                new StringContent(mutationJson, Encoding.UTF8, "application/json"),
                "mutation"
            );
            foreach ((string partName, string partContent) in contentParts)
            {
                content.Add(
                    new StringContent(partContent, Encoding.UTF8, "text/plain"),
                    partName,
                    "file.txt"
                );
            }

            var body = new MemoryStream();
            await content.CopyToAsync(body);
            body.Position = 0;
            httpContext.Request.ContentType = content.Headers.ContentType?.ToString();
            httpContext.Request.Body = body;
        }

        IAuthorization authorization = Authorization();
        var controller = new InstanceMutationsController(
            storage.DataRepository,
            new BlobRepository(Options.Create(storage.Settings)),
            storage.InstanceRepository,
            storage.MutationRepository,
            ApplicationRepository(denyRead: false),
            CreateDataService(storage),
            InstanceEventService(),
            settings,
            authorization,
            Mock.Of<IAuthorizationService>(),
            new ProcessAuthorizer(
                authorization,
                Mock.Of<IClaimsPrincipalProvider>(provider =>
                    provider.GetUser() == httpContext.User
                ),
                settings
            )
        )
        {
            ControllerContext = new ControllerContext { HttpContext = httpContext },
        };

        ActionResult<InstanceMutationResponse> result = await controller.CommitMutation(
            PartyId(instance),
            InstanceGuid(instance),
            CancellationToken.None
        );

        return Assert.IsType<InstanceMutationResponse>(
            Assert.IsType<OkObjectResult>(result.Result).Value
        );
    }
}

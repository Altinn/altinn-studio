using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Instances;
using Altinn.Platform.Storage.Interface.Models;
using Moq;

namespace Altinn.App.Core.Tests.Features.Process;

public class ServiceTaskCheckpointStoreTests
{
    private readonly Mock<IInstanceClient> _instanceClientMock = new();
    private readonly Instance _snapshotInstance;
    private readonly StorageServiceTaskCheckpointStore _store;

    public ServiceTaskCheckpointStoreTests()
    {
        _snapshotInstance = CreateInstance();
        _store = new StorageServiceTaskCheckpointStore(_instanceClientMock.Object, _snapshotInstance, "eFormidling");

        _instanceClientMock
            .Setup(x =>
                x.UpdateDataValues(
                    It.IsAny<int>(),
                    It.IsAny<Guid>(),
                    It.IsAny<DataValues>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(CreateInstance());
    }

    private static Instance CreateInstance(Dictionary<string, string>? dataValues = null) =>
        new()
        {
            Id = "1337/2b3e9260-24d9-4c0a-8b93-ef2c9c7dcbde",
            Org = "ttd",
            AppId = "ttd/test-app",
            InstanceOwner = new InstanceOwner { PartyId = "1337" },
            DataValues = dataValues,
        };

    [Fact]
    public async Task Set_WritesPrefixedKeyToStorageImmediately_AndMirrorsOntoSnapshot()
    {
        await _store.Set("shipmentWorkflowId", "wf-123", CancellationToken.None);

        // The Storage write is immediate — the whole point is surviving an attempt that fails later.
        _instanceClientMock.Verify(
            x =>
                x.UpdateDataValues(
                    1337,
                    Guid.Parse("2b3e9260-24d9-4c0a-8b93-ef2c9c7dcbde"),
                    It.Is<DataValues>(dv => dv.Values!["serviceTask:eFormidling:shipmentWorkflowId"] == "wf-123"),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );

        // The snapshot instance is kept coherent so the re-signed state blob carries the value.
        Assert.Equal("wf-123", _snapshotInstance.DataValues?["serviceTask:eFormidling:shipmentWorkflowId"]);
    }

    [Fact]
    public async Task Get_ReadsThroughToStorage_NotTheExecutionSnapshot()
    {
        // The snapshot claims nothing, but Storage has a value written by a crashed earlier attempt.
        // The guard must see Storage's truth — trusting the snapshot is what re-sends shipments.
        _snapshotInstance.DataValues = null;
        _instanceClientMock
            .Setup(x =>
                x.GetInstance(
                    _snapshotInstance,
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                CreateInstance(new Dictionary<string, string> { ["serviceTask:eFormidling:receipt"] = "r-42" })
            );

        string? value = await _store.Get("receipt", CancellationToken.None);

        Assert.Equal("r-42", value);
    }

    [Fact]
    public async Task Get_FetchesOncePerAttempt_AndScopesByPrefix()
    {
        _instanceClientMock
            .Setup(x =>
                x.GetInstance(
                    _snapshotInstance,
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                CreateInstance(
                    new Dictionary<string, string>
                    {
                        ["serviceTask:eFormidling:receipt"] = "r-42",
                        ["serviceTask:otherTask:receipt"] = "not-ours",
                        ["unrelatedDataValue"] = "ignored",
                    }
                )
            );

        Assert.Equal("r-42", await _store.Get("receipt", CancellationToken.None));
        Assert.Null(await _store.Get("somethingElse", CancellationToken.None));

        _instanceClientMock.Verify(
            x =>
                x.GetInstance(
                    It.IsAny<Instance>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task Get_AfterOwnSet_ReadsOwnWriteWithoutFetching()
    {
        await _store.Set("receipt", "r-42", CancellationToken.None);

        Assert.Equal("r-42", await _store.Get("receipt", CancellationToken.None));

        _instanceClientMock.Verify(
            x =>
                x.GetInstance(
                    It.IsAny<Instance>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
    }

    [Fact]
    public async Task Factory_CreatesStoreBoundToTheMutatorsInstance()
    {
        // The factory takes the mutator, not a bare Instance, so the mirror can only ever decorate
        // the live execution snapshot — the object later commands re-sign into the state blob.
        var mutatorMock = new Mock<IInstanceDataMutator>();
        mutatorMock.Setup(x => x.Instance).Returns(_snapshotInstance);
        var factory = new StorageServiceTaskCheckpointStoreFactory(_instanceClientMock.Object);

        IServiceTaskCheckpointStore store = factory.Create(mutatorMock.Object, "eFormidling");
        await store.Set("receipt", "r-42", CancellationToken.None);

        Assert.Equal("r-42", _snapshotInstance.DataValues?["serviceTask:eFormidling:receipt"]);
    }

    [Fact]
    public async Task Get_WhenStorageReadFails_Throws_NeverReturnsNull()
    {
        // null strictly means "never recorded". Mapping a read failure onto null would make the send
        // guard conclude "never sent" during a Storage outage — the exact resend the guard exists to
        // prevent.
        _instanceClientMock
            .Setup(x =>
                x.GetInstance(
                    _snapshotInstance,
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(new HttpRequestException("storage unavailable"));

        await Assert.ThrowsAsync<HttpRequestException>(() => _store.Get("receipt", CancellationToken.None));
    }
}

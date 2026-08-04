using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Instances;
using Altinn.Platform.Storage.Interface.Models;
using Moq;

namespace Altinn.App.Core.Tests.Features.Process;

public class StorageServiceTaskCheckpointsTests
{
    private readonly Mock<IInstanceClient> _instanceClientMock = new();
    private readonly Instance _snapshotInstance;
    private readonly StorageServiceTaskCheckpoints _checkpoints;

    public StorageServiceTaskCheckpointsTests()
    {
        _snapshotInstance = CreateInstance();
        _checkpoints = new StorageServiceTaskCheckpoints(
            _instanceClientMock.Object,
            _snapshotInstance,
            "eFormidling",
            CancellationToken.None
        );

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
        await _checkpoints.Set("shipmentWorkflowId", "wf-123");

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

        string? value = await _checkpoints.Get("receipt");

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

        Assert.Equal("r-42", await _checkpoints.Get("receipt"));
        Assert.Null(await _checkpoints.Get("somethingElse"));

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
        await _checkpoints.Set("receipt", "r-42");

        Assert.Equal("r-42", await _checkpoints.Get("receipt"));

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
    public async Task Factory_CreatesCheckpointsBoundToTheAccessorsInstance()
    {
        // The factory takes the execution's accessor, not a bare Instance, so the mirror can only
        // ever decorate the live execution snapshot — the object later commands re-sign into the
        // state blob. Accessor rather than mutator: checkpoints must never be able to touch the
        // save-on-success unit of work.
        var accessorMock = new Mock<IInstanceDataAccessor>();
        accessorMock.Setup(x => x.Instance).Returns(_snapshotInstance);
        var factory = new StorageServiceTaskCheckpointsFactory(_instanceClientMock.Object);

        IServiceTaskCheckpoints checkpoints = factory.Create(
            accessorMock.Object,
            "eFormidling",
            CancellationToken.None
        );
        await checkpoints.Set("receipt", "r-42");

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

        await Assert.ThrowsAsync<HttpRequestException>(() => _checkpoints.Get("receipt"));
    }

    [Fact]
    public async Task DegenerateArguments_AreRejected()
    {
        await Assert.ThrowsAsync<ArgumentException>(() => _checkpoints.Set(" ", "value"));
        await Assert.ThrowsAsync<ArgumentNullException>(() => _checkpoints.Set("key", null!));
        await Assert.ThrowsAsync<ArgumentException>(() => _checkpoints.Get(""));
    }
}

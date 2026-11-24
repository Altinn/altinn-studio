using System.Globalization;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Infrastructure.Clients.Secrets;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Options;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine;

/// <summary>
/// The state blob's non-data half, end to end through the service that writes and reads it: the mailbox a stage
/// minted has to reach a step that runs several callbacks later, and the blob is the only channel between them.
/// </summary>
public class WorkflowCallbackStateCarryTests
{
    private static readonly Guid _instanceGuid = new("aabbccdd-1234-5678-9012-aabbccddeeff");
    private static readonly InstanceIdentifier _instanceId = new(1337, _instanceGuid);
    private static readonly Guid _mailboxId = new("018f4e00-0000-7000-8000-0000000000aa");
    private static readonly DateTimeOffset _deadline = new(2026, 8, 30, 12, 0, 0, TimeSpan.Zero);
    private static readonly Guid _secondMailboxId = new("018f4e00-0000-7000-8000-0000000000ab");

    private static readonly StorageVersionMetadata _versions = new(InstanceVersion: 9, ProcessStateVersion: 4);

    /// <summary>The item index of the external stage whose mailbox the tests carry.</summary>
    private const int OpeningIndex = 0;

    /// <summary>A second external stage's index, for the one-at-a-time rule.</summary>
    private const int SecondIndex = 1;

    private static Instance CreateInstance() =>
        new()
        {
            Id = $"1337/{_instanceGuid}",
            AppId = "ttd/test-app",
            Org = "ttd",
            InstanceOwner = new InstanceOwner { PartyId = "1337" },
            Data = [],
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
        };

    private static WorkflowStateSigner CreateSigner()
    {
        var code = new AppCode
        {
            Id = "code-1",
            Code = "secret-code-long-enough-for-hmac",
            IssuedAt = DateTimeOffset.UtcNow.AddDays(-1),
            ExpiresAt = DateTimeOffset.UtcNow.AddDays(30),
        };
        var secrets = new Mock<IWorkflowCallbackSecretProvider>();
        secrets.Setup(x => x.GetSigningSecret()).Returns(code);
        secrets.Setup(x => x.GetValidationSecrets()).Returns([code]);
        return new WorkflowStateSigner(secrets.Object);
    }

    private static WorkflowCallbackStateService CreateService(WorkflowStateSigner? signer = null)
    {
        IAppMetadata appMetadata = CreateAppMetadata();

        return new WorkflowCallbackStateService(
            CreateInitializer(appMetadata),
            null!,
            appMetadata,
            Mock.Of<IAppModel>(),
            signer ?? CreateSigner(),
            EmptyProcessReader()
        );
    }

    [Fact]
    public async Task Capture_ThenRestore_CarriesTheMailboxToTheNextStep()
    {
        WorkflowCallbackStateService service = CreateService();

        var minting = new WorkflowCallbackStateCarry();
        minting.RecordMailbox(OpeningIndex, _mailboxId, _deadline);
        InstanceDataUnitOfWork unitOfWork = await CreateUnitOfWork();
        string afterMint = await service.CaptureState(unitOfWork, minting);

        (InstanceDataUnitOfWork nextUnitOfWork, WorkflowCallbackStateCarry forwarded) = await service.RestoreState(
            _instanceId,
            afterMint,
            "nb"
        );
        AssertCarries(forwarded, OpeningIndex);
        string afterOrdinaryStep = await service.CaptureState(nextUnitOfWork, forwarded);

        (_, WorkflowCallbackStateCarry atTheEnqueue) = await service.RestoreState(_instanceId, afterOrdinaryStep, "nb");
        AssertCarries(atTheEnqueue, OpeningIndex);
    }

    [Fact]
    public async Task Capture_ThenRestore_CarriesTheMailboxOfALaterStageUnderItsOwnIndex()
    {
        WorkflowCallbackStateService service = CreateService();
        var minting = new WorkflowCallbackStateCarry();
        minting.RecordMailbox(SecondIndex, _secondMailboxId, _deadline.AddDays(1));
        InstanceDataUnitOfWork unitOfWork = await CreateUnitOfWork();

        string captured = await service.CaptureState(unitOfWork, minting);

        (_, WorkflowCallbackStateCarry carry) = await service.RestoreState(_instanceId, captured, "nb");
        Assert.Null(carry.FindMailbox(OpeningIndex));
        CarriedMailbox? second = carry.FindMailbox(SecondIndex);
        Assert.NotNull(second);
        Assert.Equal(_secondMailboxId, second.Id);
        Assert.Equal(_deadline.AddDays(1), second.Deadline);
        Assert.Same(second, carry.OpenMailbox);
    }

    /// <summary>
    /// The field names and the key shape are a wire-compatibility surface — an in-flight workflow's next
    /// callback carries a blob written by the code that enqueued it — and the round-trip tests above cannot
    /// see a rename, because they serialize and deserialize with the same code. This pins the literal shape:
    /// mailboxes keyed by the opening stage's item index as a string.
    /// </summary>
    [Fact]
    public async Task Capture_NamesTheMailboxMapAndItsFieldsOnTheWire()
    {
        WorkflowStateSigner signer = CreateSigner();
        WorkflowCallbackStateService service = CreateService(signer);
        var minting = new WorkflowCallbackStateCarry();
        minting.RecordMailbox(OpeningIndex, _mailboxId, _deadline);
        InstanceDataUnitOfWork unitOfWork = await CreateUnitOfWork();

        string captured = await service.CaptureState(unitOfWork, minting);

        string payload = signer.Verify(captured, SigningDomain.CallbackState);
        Assert.Contains(
            $$""" "mailboxes":{"{{OpeningIndex}}":{"id":"{{_mailboxId}}","deadline": """.Trim(),
            payload,
            StringComparison.Ordinal
        );
    }

    [Fact]
    public async Task Capture_WithoutTheCarry_DropsTheMailbox()
    {
        // The silent-break mutation: capturing the instance data alone leaves the enqueue step with no address,
        // which is why it fails permanently rather than guessing.
        WorkflowCallbackStateService service = CreateService();
        var minting = new WorkflowCallbackStateCarry();
        minting.RecordMailbox(OpeningIndex, _mailboxId, _deadline);
        InstanceDataUnitOfWork unitOfWork = await CreateUnitOfWork();

        string captured = await service.CaptureState(unitOfWork);

        (_, WorkflowCallbackStateCarry carry) = await service.RestoreState(_instanceId, captured, "nb");
        Assert.Null(carry.Mailboxes);
    }

    [Fact]
    public async Task Capture_AfterTheMailboxClosed_DropsIt()
    {
        WorkflowCallbackStateService service = CreateService();
        var concluding = new WorkflowCallbackStateCarry();
        concluding.RecordMailbox(OpeningIndex, _mailboxId, _deadline);
        InstanceDataUnitOfWork unitOfWork = await CreateUnitOfWork();

        string whileOpen = await service.CaptureState(unitOfWork, concluding);
        (_, WorkflowCallbackStateCarry open) = await service.RestoreState(_instanceId, whileOpen, "nb");
        AssertCarries(open, OpeningIndex);

        concluding.RecordMailboxClosed();
        string afterClose = await service.CaptureState(unitOfWork, concluding);

        (_, WorkflowCallbackStateCarry carried) = await service.RestoreState(_instanceId, afterClose, "nb");
        Assert.Null(carried.Mailboxes);
        Assert.Null(carried.FindMailbox(OpeningIndex));
        Assert.Null(carried.OpenMailbox);
    }

    [Fact]
    public void RecordMailbox_AfterTheOpenOneClosed_CarriesTheNextStagesMailbox()
    {
        // The next external stage opens its own once the one before it is done with its replies.
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(OpeningIndex, _mailboxId, _deadline);
        carry.RecordMailboxClosed();

        carry.RecordMailbox(SecondIndex, _secondMailboxId, _deadline);

        Assert.Null(carry.FindMailbox(OpeningIndex));
        Assert.Equal(_secondMailboxId, carry.FindMailbox(SecondIndex)?.Id);
        Assert.Equal([SecondIndex.ToString(CultureInfo.InvariantCulture)], carry.Mailboxes?.Keys);
    }

    [Fact]
    public async Task Restore_OfABlobWrittenBeforeMailboxesExisted_CarriesNothing()
    {
        // Blobs already in flight have no mailbox field at all; they must restore, not fail.
        WorkflowCallbackStateService service = CreateService();
        InstanceDataUnitOfWork unitOfWork = await CreateUnitOfWork();
        string blobWithNoMailbox = await service.CaptureState(unitOfWork);

        (_, WorkflowCallbackStateCarry carry) = await service.RestoreState(_instanceId, blobWithNoMailbox, "nb");

        Assert.Null(carry.Mailboxes);
    }

    [Fact]
    public void RecordMailbox_Twice_WithDifferentMailboxes_Throws()
    {
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(OpeningIndex, _mailboxId, _deadline);

        carry.RecordMailbox(OpeningIndex, _mailboxId, _deadline);
        AssertCarries(carry, OpeningIndex);

        Assert.Throws<InvalidOperationException>(() => carry.RecordMailbox(OpeningIndex, Guid.NewGuid(), _deadline));
    }

    [Fact]
    public void RecordMailbox_ForAnotherStageWhileOneIsOpen_Throws()
    {
        // A service task keeps one mailbox open at a time, so a second while the first is carried means the first
        // was never closed.
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(OpeningIndex, _mailboxId, _deadline);

        Assert.Throws<InvalidOperationException>(() => carry.RecordMailbox(SecondIndex, _secondMailboxId, _deadline));
        AssertCarries(carry, OpeningIndex);
    }

    [Fact]
    public void Restore_OfABlobCarryingTwoMailboxes_Throws()
    {
        // Only a version that opened several mailboxes at once wrote such a blob.
        var state = new WorkflowCallbackState
        {
            Instance = CreateInstance(),
            InstanceVersion = 9,
            ProcessStateVersion = 4,
            FormData = [],
            Mailboxes = new Dictionary<string, CarriedMailbox>(StringComparer.Ordinal)
            {
                ["0"] = new CarriedMailbox { Id = _mailboxId, Deadline = _deadline },
                ["1"] = new CarriedMailbox { Id = _secondMailboxId, Deadline = _deadline },
            },
        };

        InvalidOperationException exception = Assert.Throws<InvalidOperationException>(() =>
            new WorkflowCallbackStateCarry(state)
        );
        Assert.Contains("carries 2 mailboxes", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Restore_OfABlobKeyedByAnythingButAnIndex_Throws()
    {
        var state = new WorkflowCallbackState
        {
            Instance = CreateInstance(),
            InstanceVersion = 9,
            ProcessStateVersion = 4,
            FormData = [],
            Mailboxes = new Dictionary<string, CarriedMailbox>
            {
                ["SendToArchive"] = new CarriedMailbox { Id = _mailboxId, Deadline = _deadline },
            },
        };

        InvalidOperationException exception = Assert.Throws<InvalidOperationException>(() =>
            new WorkflowCallbackStateCarry(state)
        );
        Assert.Contains("'SendToArchive'", exception.Message, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("00")]
    [InlineData("007")]
    public void Restore_OfABlobKeyedByANonCanonicalIndex_Throws(string key)
    {
        var state = new WorkflowCallbackState
        {
            Instance = CreateInstance(),
            InstanceVersion = 9,
            ProcessStateVersion = 4,
            FormData = [],
            Mailboxes = new Dictionary<string, CarriedMailbox>(StringComparer.Ordinal)
            {
                [key] = new CarriedMailbox { Id = _mailboxId, Deadline = _deadline },
            },
        };

        InvalidOperationException exception = Assert.Throws<InvalidOperationException>(() =>
            new WorkflowCallbackStateCarry(state)
        );
        Assert.Contains($"'{key}'", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Capture_ThenRestore_CarriesCachedSigneeStateBytesOnly()
    {
        var appMetadata = CreateAppMetadata();
        var processReader = new Mock<IProcessReader>();
        processReader
            .Setup(x => x.GetProcessTasks())
            .Returns([
                new ProcessTask
                {
                    Id = "Task_1",
                    ExtensionElements = new()
                    {
                        TaskExtension = new()
                        {
                            SignatureConfiguration = new() { SigneeStatesDataTypeId = "signeeStates" },
                        },
                    },
                },
            ]);
        var service = new WorkflowCallbackStateService(
            CreateInitializer(appMetadata),
            null!,
            appMetadata,
            Mock.Of<IAppModel>(),
            CreateSigner(),
            processReader.Object
        );
        Instance instance = CreateInstance();
        var signeeState = new DataElement
        {
            Id = Guid.NewGuid().ToString(),
            DataType = "signeeStates",
            BlobVersionId = "v2",
        };
        var attachment = new DataElement
        {
            Id = Guid.NewGuid().ToString(),
            DataType = "attachment",
            BlobVersionId = "v1",
        };
        var uncachedSigneeState = new DataElement
        {
            Id = Guid.NewGuid().ToString(),
            DataType = "signeeStates",
            BlobVersionId = "v1",
        };
        instance.Data = [signeeState, attachment, uncachedSigneeState];
        InstanceDataUnitOfWork unitOfWork = await CreateInitializer(appMetadata)
            .Init(instance, _versions, "Task_1", "nb");
        unitOfWork.PreloadBinaryData(signeeState, "[]"u8.ToArray());
        unitOfWork.PreloadBinaryData(attachment, "attachment"u8.ToArray());

        string captured = await service.CaptureState(unitOfWork);

        (InstanceDataUnitOfWork restored, _) = await service.RestoreState(_instanceId, captured, "nb");
        Assert.True(restored.TryGetCachedBinaryData(signeeState, out ReadOnlyMemory<byte> bytes));
        Assert.Equal("[]"u8.ToArray(), bytes.ToArray());
        Assert.False(restored.TryGetCachedBinaryData(attachment, out _));
        Assert.False(restored.TryGetCachedBinaryData(uncachedSigneeState, out _));
    }

    private static void AssertCarries(WorkflowCallbackStateCarry carry, int openingIndex)
    {
        CarriedMailbox? mailbox = carry.FindMailbox(openingIndex);
        Assert.NotNull(mailbox);
        Assert.Equal(_mailboxId, mailbox.Id);
        Assert.Equal(_deadline, mailbox.Deadline);
    }

    private static Task<InstanceDataUnitOfWork> CreateUnitOfWork() =>
        CreateInitializer(CreateAppMetadata()).Init(CreateInstance(), _versions, "Task_1", "nb");

    private static InstanceDataUnitOfWorkInitializer CreateInitializer(IAppMetadata appMetadata)
    {
        var dataClient = new Mock<IDataClient>();
        Mock<IDataClientWithStorageMetadata> metadataClient = dataClient.As<IDataClientWithStorageMetadata>();
        Mock<IInstanceMutationClient> mutationClient = dataClient.As<IInstanceMutationClient>();
        return new InstanceDataUnitOfWorkInitializer(
            metadataClient.Object,
            mutationClient.Object,
            Mock.Of<IInstanceClientWithStorageMetadata>(),
            appMetadata,
            Mock.Of<ITranslationService>(),
            // Only reached for form data, and every blob here carries none.
            null!,
            Mock.Of<IAppResources>(),
            Options.Create(new FrontEndSettings())
        );
    }

    private static IAppMetadata CreateAppMetadata()
    {
        var appMetadata = new Mock<IAppMetadata>();
        appMetadata
            .Setup(x => x.ApplicationMetadata)
            .Returns(new ApplicationMetadata("ttd/test-app") { DataTypes = [] });
        return appMetadata.Object;
    }

    private static IProcessReader EmptyProcessReader() =>
        Mock.Of<IProcessReader>(r => r.GetProcessTasks() == new List<ProcessTask>());
}

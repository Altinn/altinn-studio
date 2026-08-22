using Altinn.App.Core.Configuration;
using Altinn.App.Core.Infrastructure.Clients.Secrets;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
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
    private const string SendStage = "SendToArchive";

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
            signer ?? CreateSigner()
        );
    }

    [Fact]
    public async Task Capture_ThenRestore_CarriesTheMailboxToTheNextStep()
    {
        WorkflowCallbackStateService service = CreateService();

        var minting = new WorkflowCallbackStateCarry();
        minting.RecordMailbox(SendStage, _mailboxId, _deadline);
        InstanceDataUnitOfWork unitOfWork = await CreateUnitOfWork();
        string afterMint = await service.CaptureState(unitOfWork, minting);

        (InstanceDataUnitOfWork nextUnitOfWork, WorkflowCallbackStateCarry forwarded) = await service.RestoreState(
            _instanceId,
            afterMint,
            "nb"
        );
        AssertCarries(forwarded, SendStage);
        string afterOrdinaryStep = await service.CaptureState(nextUnitOfWork, forwarded);

        (_, WorkflowCallbackStateCarry atTheEnqueue) = await service.RestoreState(_instanceId, afterOrdinaryStep, "nb");
        AssertCarries(atTheEnqueue, SendStage);
    }

    [Fact]
    public async Task Capture_ThenRestore_KeepsEveryExchangeApartByItsOpeningStage()
    {
        // Phase 1 opens one mailbox per task, but the blob is a map from day one so a second exchange needs no
        // format migration against workflows already in flight.
        WorkflowCallbackStateService service = CreateService();
        var minting = new WorkflowCallbackStateCarry();
        minting.RecordMailbox(SendStage, _mailboxId, _deadline);
        minting.RecordMailbox("SendReceipt", _secondMailboxId, _deadline.AddDays(1));
        InstanceDataUnitOfWork unitOfWork = await CreateUnitOfWork();

        string captured = await service.CaptureState(unitOfWork, minting);

        (_, WorkflowCallbackStateCarry carry) = await service.RestoreState(_instanceId, captured, "nb");
        AssertCarries(carry, SendStage);
        CarriedMailbox? second = carry.FindMailbox("SendReceipt");
        Assert.NotNull(second);
        Assert.Equal(_secondMailboxId, second.Id);
        Assert.Equal(_deadline.AddDays(1), second.Deadline);
        Assert.Equal(2, carry.Mailboxes!.Count);
    }

    /// <summary>
    /// The field names are a wire-compatibility surface — an in-flight workflow's next callback carries a blob
    /// written by the code that enqueued it — and the round-trip tests above cannot see a rename, because they
    /// serialize and deserialize with the same code. This pins the literal shape the phase-2 map key depends on.
    /// </summary>
    [Fact]
    public async Task Capture_NamesTheMailboxMapAndItsFieldsOnTheWire()
    {
        WorkflowStateSigner signer = CreateSigner();
        WorkflowCallbackStateService service = CreateService(signer);
        var minting = new WorkflowCallbackStateCarry();
        minting.RecordMailbox(SendStage, _mailboxId, _deadline);
        InstanceDataUnitOfWork unitOfWork = await CreateUnitOfWork();

        string captured = await service.CaptureState(unitOfWork, minting);

        string payload = signer.Verify(captured, SigningDomain.CallbackState);
        Assert.Contains(
            $"\"mailboxes\":{{\"{SendStage}\":{{\"id\":\"{_mailboxId}\",\"deadline\":",
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
        minting.RecordMailbox(SendStage, _mailboxId, _deadline);
        InstanceDataUnitOfWork unitOfWork = await CreateUnitOfWork();

        string captured = await service.CaptureState(unitOfWork);

        (_, WorkflowCallbackStateCarry carry) = await service.RestoreState(_instanceId, captured, "nb");
        Assert.Null(carry.Mailboxes);
    }

    [Fact]
    public async Task Capture_AfterTheExchangeConcluded_DropsTheMailbox()
    {
        WorkflowCallbackStateService service = CreateService();
        var concluding = new WorkflowCallbackStateCarry();
        concluding.RecordMailbox(SendStage, _mailboxId, _deadline);
        InstanceDataUnitOfWork unitOfWork = await CreateUnitOfWork();

        string whileOpen = await service.CaptureState(unitOfWork, concluding);
        (_, WorkflowCallbackStateCarry open) = await service.RestoreState(_instanceId, whileOpen, "nb");
        AssertCarries(open, SendStage);

        concluding.RecordMailboxConcluded(SendStage);
        string afterConclusion = await service.CaptureState(unitOfWork, concluding);

        (_, WorkflowCallbackStateCarry carried) = await service.RestoreState(_instanceId, afterConclusion, "nb");
        Assert.Null(carried.Mailboxes);
        Assert.Null(carried.FindMailbox(SendStage));
    }

    [Fact]
    public async Task Capture_AfterOneOfTwoExchangesConcluded_KeepsTheOtherTraveling()
    {
        WorkflowCallbackStateService service = CreateService();
        var concluding = new WorkflowCallbackStateCarry();
        concluding.RecordMailbox(SendStage, _mailboxId, _deadline);
        concluding.RecordMailbox("SendReceipt", _secondMailboxId, _deadline);
        InstanceDataUnitOfWork unitOfWork = await CreateUnitOfWork();

        concluding.RecordMailboxConcluded(SendStage);
        string captured = await service.CaptureState(unitOfWork, concluding);

        (_, WorkflowCallbackStateCarry carry) = await service.RestoreState(_instanceId, captured, "nb");
        Assert.Null(carry.FindMailbox(SendStage));
        CarriedMailbox? stillOpen = carry.FindMailbox("SendReceipt");
        Assert.NotNull(stillOpen);
        Assert.Equal(_secondMailboxId, stillOpen.Id);
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
        carry.RecordMailbox(SendStage, _mailboxId, _deadline);

        carry.RecordMailbox(SendStage, _mailboxId, _deadline);
        AssertCarries(carry, SendStage);

        Assert.Throws<InvalidOperationException>(() => carry.RecordMailbox(SendStage, Guid.NewGuid(), _deadline));
    }

    [Fact]
    public void RecordMailbox_ForAnotherStage_IsNotAConflict()
    {
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(SendStage, _mailboxId, _deadline);

        carry.RecordMailbox("SendReceipt", _secondMailboxId, _deadline);

        Assert.Equal(2, carry.Mailboxes!.Count);
    }

    /// <summary>Stage names are matched ordinally, like every other stage-name comparison.</summary>
    [Fact]
    public void FindMailbox_MatchesTheStageNameOrdinally()
    {
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(SendStage, _mailboxId, _deadline);

        Assert.Null(carry.FindMailbox("sendtoarchive"));
    }

    private static void AssertCarries(WorkflowCallbackStateCarry carry, string stageName)
    {
        CarriedMailbox? mailbox = carry.FindMailbox(stageName);
        Assert.NotNull(mailbox);
        Assert.Equal(_mailboxId, mailbox.Id);
        Assert.Equal(_deadline, mailbox.Deadline);
    }

    private static Task<InstanceDataUnitOfWork> CreateUnitOfWork() =>
        CreateInitializer(CreateAppMetadata()).Init(CreateInstance(), "Task_1", "nb");

    private static InstanceDataUnitOfWorkInitializer CreateInitializer(IAppMetadata appMetadata) =>
        new(
            Mock.Of<IDataClient>(),
            Mock.Of<IInstanceClient>(),
            appMetadata,
            Mock.Of<ITranslationService>(),
            // Only reached for form data, and every blob here carries none.
            null!,
            Mock.Of<IAppResources>(),
            Options.Create(new FrontEndSettings())
        );

    private static IAppMetadata CreateAppMetadata()
    {
        var appMetadata = new Mock<IAppMetadata>();
        appMetadata
            .Setup(x => x.GetApplicationMetadata())
            .ReturnsAsync(new ApplicationMetadata("ttd/test-app") { DataTypes = [] });
        return appMetadata.Object;
    }
}

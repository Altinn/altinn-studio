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

    private static WorkflowCallbackStateService CreateService()
    {
        IAppMetadata appMetadata = CreateAppMetadata();

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

        return new WorkflowCallbackStateService(
            CreateInitializer(appMetadata),
            null!,
            appMetadata,
            Mock.Of<IAppModel>(),
            new WorkflowStateSigner(secrets.Object)
        );
    }

    [Fact]
    public async Task Capture_ThenRestore_CarriesTheMailboxToTheNextStep()
    {
        WorkflowCallbackStateService service = CreateService();

        var minting = new WorkflowCallbackStateCarry();
        minting.RecordMailbox(_mailboxId);
        InstanceDataUnitOfWork unitOfWork = await CreateUnitOfWork();
        string afterMint = await service.CaptureState(unitOfWork, minting);

        (InstanceDataUnitOfWork nextUnitOfWork, WorkflowCallbackStateCarry forwarded) = await service.RestoreState(
            _instanceId,
            afterMint,
            "nb"
        );
        Assert.Equal(_mailboxId, forwarded.MailboxId);
        string afterOrdinaryStep = await service.CaptureState(nextUnitOfWork, forwarded);

        (_, WorkflowCallbackStateCarry atTheEnqueue) = await service.RestoreState(_instanceId, afterOrdinaryStep, "nb");
        Assert.Equal(_mailboxId, atTheEnqueue.MailboxId);
    }

    [Fact]
    public async Task Capture_WithoutTheCarry_DropsTheMailbox()
    {
        // The silent-break mutation: capturing the instance data alone leaves the enqueue step with no address,
        // which is why it fails permanently rather than guessing.
        WorkflowCallbackStateService service = CreateService();
        var minting = new WorkflowCallbackStateCarry();
        minting.RecordMailbox(_mailboxId);
        InstanceDataUnitOfWork unitOfWork = await CreateUnitOfWork();

        string captured = await service.CaptureState(unitOfWork);

        (_, WorkflowCallbackStateCarry carry) = await service.RestoreState(_instanceId, captured, "nb");
        Assert.Null(carry.MailboxId);
    }

    [Fact]
    public async Task Capture_AfterTheExchangeConcluded_DropsTheMailbox()
    {
        WorkflowCallbackStateService service = CreateService();
        var concluding = new WorkflowCallbackStateCarry();
        concluding.RecordMailbox(_mailboxId);
        InstanceDataUnitOfWork unitOfWork = await CreateUnitOfWork();

        string whileOpen = await service.CaptureState(unitOfWork, concluding);
        (_, WorkflowCallbackStateCarry open) = await service.RestoreState(_instanceId, whileOpen, "nb");
        Assert.Equal(_mailboxId, open.MailboxId);

        concluding.RecordMailboxConcluded();
        string afterConclusion = await service.CaptureState(unitOfWork, concluding);

        (_, WorkflowCallbackStateCarry carried) = await service.RestoreState(_instanceId, afterConclusion, "nb");
        Assert.Null(carried.MailboxId);
    }

    [Fact]
    public async Task Restore_OfABlobWrittenBeforeMailboxesExisted_CarriesNothing()
    {
        // Blobs already in flight have no mailbox field at all; they must restore, not fail.
        WorkflowCallbackStateService service = CreateService();
        InstanceDataUnitOfWork unitOfWork = await CreateUnitOfWork();
        string blobWithNoMailbox = await service.CaptureState(unitOfWork);

        (_, WorkflowCallbackStateCarry carry) = await service.RestoreState(_instanceId, blobWithNoMailbox, "nb");

        Assert.Null(carry.MailboxId);
    }

    [Fact]
    public void RecordMailbox_Twice_WithDifferentMailboxes_Throws()
    {
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(_mailboxId);

        carry.RecordMailbox(_mailboxId);
        Assert.Equal(_mailboxId, carry.MailboxId);

        Assert.Throws<InvalidOperationException>(() => carry.RecordMailbox(Guid.NewGuid()));
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

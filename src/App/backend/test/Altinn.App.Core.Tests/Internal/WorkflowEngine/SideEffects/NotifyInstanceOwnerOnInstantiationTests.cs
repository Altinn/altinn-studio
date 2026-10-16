using System.Net;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Notifications;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Registers;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.SideEffects;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Notifications.Future;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.SideEffects;

/// <summary>
/// The instantiation notification, run as the side effect it is: through <see cref="ExecuteSideEffect"/>, with
/// the notification it was enqueued with as its input.
/// </summary>
public class NotifyInstanceOwnerOnInstantiationTests
{
    private readonly Mock<INotificationService> _notificationService = new();
    private readonly Mock<IAltinnPartyClient> _partyClient = new();

    private static Instance CreateInstance(string partyId = "1337") =>
        new()
        {
            Id = $"{partyId}/2b3e9260-24d9-4c0a-8b93-ef2c9c7dcbde",
            Org = "ttd",
            AppId = "ttd/test-app",
            InstanceOwner = new InstanceOwner { PartyId = partyId },
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
        };

    private Task<ProcessEngineCommandResult> Run(Instance instance, string? arguments)
    {
        var mutator = new Mock<IInstanceDataMutator>();
        mutator.Setup(x => x.Instance).Returns(instance);
        var context = new ProcessEngineCommandContext
        {
            StateCarry = new(),
            AppId = new AppIdentifier("ttd", "test-app"),
            InstanceId = new InstanceIdentifier(1337, Guid.NewGuid()),
            InstanceDataMutator = mutator.Object,
            CancellationToken = CancellationToken.None,
            Payload = new AppCallbackPayload
            {
                CommandKey = ExecuteSideEffect.Key,
                Actor = new Actor { UserId = 1337 },
                ExecutionReferenceTime = new DateTimeOffset(2025, 3, 14, 9, 26, 53, TimeSpan.Zero),
                State = "{}",
                WorkflowId = Guid.NewGuid(),
                StepId = Guid.NewGuid(),
            },
        };

        var services = new ServiceCollection();
        services.AddSingleton<AppImplementationFactory>();
        services.AddSingleton<ISideEffect>(
            new NotifyInstanceOwnerOnInstantiation(_notificationService.Object, _partyClient.Object)
        );
        var factory = services.BuildServiceProvider().GetRequiredService<AppImplementationFactory>();
        return new ExecuteSideEffect(factory, TestMailboxDeliveryEnvelope.Create()).Execute(
            context,
            new ExecuteSideEffectPayload(NotifyInstanceOwnerOnInstantiation.SideEffectName, 0, arguments)
        );
    }

    private static string? Arguments(InstantiationNotification? notification = null) =>
        SideEffectInput.Serialize(notification ?? new InstantiationNotification { Language = "nn" });

    private void PartyExists() =>
        _partyClient
            .Setup(x => x.GetParty(1337, It.IsAny<StorageAuthenticationMethod?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Party { PartyId = 1337, Name = "Ola Nordmann" });

    [Fact]
    public async Task Send_NotifiesTheOwnerWithTheNotificationItWasEnqueuedWith()
    {
        PartyExists();
        InstantiationNotification? sent = null;
        _notificationService
            .Setup(x =>
                x.NotifyInstanceOwnerOnInstantiation(
                    It.IsAny<Instance>(),
                    It.IsAny<Party>(),
                    It.IsAny<InstantiationNotification>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback<Instance, Party, InstantiationNotification, CancellationToken>((_, _, n, _) => sent = n)
            .Returns(Task.CompletedTask);

        ProcessEngineCommandResult result = await Run(CreateInstance(), Arguments());

        var success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.Null(success.ProcessNextContinuation);
        Assert.Equal("nn", sent?.Language);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("not json")]
    public async Task Send_WithoutAReadableNotification_FailsPermanently(string? arguments)
    {
        ProcessEngineCommandResult result = await Run(CreateInstance(), arguments);

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Contains("readable notification", failed.ErrorMessage, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Send_InvalidPartyId_FailsPermanently()
    {
        ProcessEngineCommandResult result = await Run(CreateInstance(partyId: "not-a-number"), Arguments());

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Contains("Invalid PartyId", failed.ErrorMessage, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Send_UnknownParty_FailsPermanently()
    {
        ProcessEngineCommandResult result = await Run(CreateInstance(), Arguments());

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Contains("Party not found", failed.ErrorMessage, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Send_RejectedByNotifications_FailsPermanently()
    {
        PartyExists();
        _notificationService
            .Setup(x =>
                x.NotifyInstanceOwnerOnInstantiation(
                    It.IsAny<Instance>(),
                    It.IsAny<Party>(),
                    It.IsAny<InstantiationNotification>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(new ServiceException(HttpStatusCode.BadRequest, "Invalid order"));

        ProcessEngineCommandResult result = await Run(CreateInstance(), Arguments());

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Contains("Invalid order", failed.ErrorMessage, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Send_TransientFailure_IsRetried()
    {
        PartyExists();
        _notificationService
            .Setup(x =>
                x.NotifyInstanceOwnerOnInstantiation(
                    It.IsAny<Instance>(),
                    It.IsAny<Party>(),
                    It.IsAny<InstantiationNotification>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(new HttpRequestException("Notifications is down"));

        ProcessEngineCommandResult result = await Run(CreateInstance(), Arguments());

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.False(failed.NonRetryable);
    }
}

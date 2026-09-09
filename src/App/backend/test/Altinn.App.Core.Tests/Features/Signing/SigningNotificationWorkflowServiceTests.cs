using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Signing;
using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Features.Signing.Services;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.WorkflowEngine.Http;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;
using Moq;
using Signee = Altinn.App.Core.Features.Signing.Models.Signee;

namespace Altinn.App.Core.Tests.Features.Signing;

public class SigningNotificationWorkflowServiceTests
{
    private readonly Guid _instanceId = Guid.NewGuid();
    private readonly Guid _elementId = Guid.NewGuid();
    private readonly Guid _signeeId = Guid.NewGuid();
    private readonly Mock<IWorkflowEngineClient> _client = new(MockBehavior.Strict);
    private readonly Mock<ISigneeContextsManager> _manager = new(MockBehavior.Strict);
    private readonly Mock<IInstanceDataAccessor> _accessor = new(MockBehavior.Strict);
    private readonly AltinnSignatureConfiguration _configuration = new() { SigneeStatesDataTypeId = "signee-state" };

    public SigningNotificationWorkflowServiceTests()
    {
        var element = new DataElement { Id = _elementId.ToString(), DataType = "signee-state" };
        var instance = new Instance
        {
            Id = $"123/{_instanceId}",
            AppId = "ttd/app",
            InstanceOwner = new InstanceOwner { PartyId = "123" },
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Signing" } },
            Data = [element],
        };
        _accessor.SetupGet(x => x.Instance).Returns(instance);
        _manager.Setup(x => x.FindTaskSigneeStateElement(_accessor.Object, _configuration, "Signing")).Returns(element);
        _manager
            .Setup(x => x.LoadSigneeContexts(_accessor.Object, _configuration, element))
            .ReturnsAsync([
                new SigneeContext
                {
                    TaskId = "Signing",
                    SigneeId = _signeeId,
                    Signee = new Signee.PersonSignee
                    {
                        FullName = "Example Recipient",
                        SocialSecurityNumber = "test-identifier",
                        Party = new Party { PartyId = 456 },
                    },
                    SigneeState = new SigneeContextState(),
                },
            ]);
    }

    [Theory]
    [InlineData(false, "NotificationFailed")]
    [InlineData(true, "NotificationRetryExhausted")]
    public async Task List_ProjectsSafeFailureCategory_WithoutDependencyMessage(bool retryExhausted, string errorCode)
    {
        var workflow = Workflow(retryExhausted);
        SetupWorkflows([workflow]);
        var service = new SigningNotificationWorkflowService(_client.Object, _manager.Object);

        var job = Assert.Single(await service.List(_accessor.Object, _configuration, "Signing", default));

        Assert.Equal(workflow.DatabaseId, job.WorkflowId);
        Assert.Equal(_signeeId, job.SigneeId);
        Assert.Equal(456, job.PartyId);
        Assert.Equal(errorCode, job.ErrorCode);
        Assert.True(job.CanResume);
        Assert.Equal(2, job.RetryCount);
        Assert.DoesNotContain("private recipient", job.ToString());
    }

    [Theory]
    [InlineData(408, "NotificationRetryExhausted")]
    [InlineData(429, "NotificationRetryExhausted")]
    [InlineData(503, "NotificationRetryExhausted")]
    [InlineData(422, "NotificationFailed")]
    [InlineData(200, "NotificationFailed")]
    [InlineData(null, "NotificationFailed")]
    public async Task List_ClassifiesTheFinalFailure_AfterEarlierRetries(int? finalStatus, string errorCode)
    {
        var workflow = Workflow();
        SetupWorkflows([
            workflow with
            {
                Steps =
                [
                    workflow.Steps[0] with
                    {
                        ErrorHistory =
                        [
                            new ErrorEntry(DateTimeOffset.UtcNow, "earlier transient failure", 500, true),
                            new ErrorEntry(DateTimeOffset.UtcNow, "final failure", finalStatus, false),
                        ],
                    },
                ],
            },
        ]);
        var job = Assert.Single(
            await new SigningNotificationWorkflowService(_client.Object, _manager.Object).List(
                _accessor.Object,
                _configuration,
                "Signing",
                default
            )
        );
        Assert.Equal(errorCode, job.ErrorCode);
    }

    [Theory]
    [InlineData("ttd/app", true)]
    [InlineData("ttd%2fapp", true)]
    [InlineData("ttd%2Fapp", true)]
    [InlineData("other%2fapp", false)]
    [InlineData("ttd%252fapp", false)]
    public async Task List_ValidatesTheNamespaceWithEncodedRouteSeparators(string ns, bool included)
    {
        SetupWorkflows([Workflow() with { Namespace = ns }]);
        var jobs = await new SigningNotificationWorkflowService(_client.Object, _manager.Object).List(
            _accessor.Object,
            _configuration,
            "Signing",
            default
        );
        Assert.Equal(included ? 1 : 0, jobs.Count);
    }

    [Fact]
    public async Task List_RejectsForeignSupersededAndNonNotificationJobs_EvenIfEngineIgnoresFilters()
    {
        var valid = Workflow();
        var oldEntry = Workflow() with { Labels = WithInitialization(Guid.NewGuid()) };
        SetupWorkflows([
            valid,
            Workflow() with
            {
                Namespace = "other/app",
            },
            Workflow() with
            {
                CollectionKey = Guid.NewGuid().ToString(),
            },
            Workflow() with
            {
                IsHead = true,
            },
            Workflow() with
            {
                Labels = null,
            },
            oldEntry,
            Workflow() with
            {
                Labels = Labels(Guid.NewGuid()),
            },
        ]);

        var jobs = await new SigningNotificationWorkflowService(_client.Object, _manager.Object).List(
            _accessor.Object,
            _configuration,
            "Signing",
            default
        );

        Assert.Equal(valid.DatabaseId, Assert.Single(jobs).WorkflowId);

        Dictionary<string, string> WithInitialization(Guid id)
        {
            var labels = Labels();
            labels[SigningWorkflowLabels.SigningInitializationLabel] = id.ToString("D");
            return labels;
        }
    }

    [Fact]
    public async Task List_AfterTaskExit_DoesNotQueryTheEngine()
    {
        _accessor.Object.Instance.Process.CurrentTask.ElementId = "NextTask";
        var service = new SigningNotificationWorkflowService(_client.Object, _manager.Object);

        Assert.Empty(await service.List(_accessor.Object, _configuration, "Signing", default));
        _client.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Resume_TargetsOnlyTheSelectedWorkflow()
    {
        Guid workflowId = Guid.NewGuid();
        _client
            .Setup(x => x.ResumeWorkflow("ttd/app", workflowId, false, default))
            .ReturnsAsync(new ResumeWorkflowResponse(workflowId, DateTimeOffset.UtcNow, []));

        await new SigningNotificationWorkflowService(_client.Object, _manager.Object).Resume(
            "ttd/app",
            workflowId,
            default
        );

        _client.Verify(x => x.ResumeWorkflow("ttd/app", workflowId, false, default), Times.Once);
        _client.VerifyNoOtherCalls();
    }

    private void SetupWorkflows(IReadOnlyList<WorkflowStatusResponse> workflows) =>
        _client
            .Setup(x =>
                x.ListWorkflows(
                    "ttd/app",
                    _instanceId.ToString(),
                    It.IsAny<Dictionary<string, string>>(),
                    null,
                    default
                )
            )
            .ReturnsAsync(workflows);

    private Dictionary<string, string> Labels(Guid? signeeId = null) =>
        new()
        {
            [SigningWorkflowLabels.SigningNotificationLabel] = "true",
            [SigningWorkflowLabels.SigningInitializationLabel] = _elementId.ToString("D"),
            [SigningWorkflowLabels.SigningTaskLabel] = "Signing",
            [SigningWorkflowLabels.SigningSigneeLabel] = (signeeId ?? _signeeId).ToString("D"),
        };

    private WorkflowStatusResponse Workflow(bool retryExhausted = false) =>
        new()
        {
            DatabaseId = Guid.NewGuid(),
            OperationId = "Signing notification",
            IdempotencyKey = "notification",
            Namespace = "ttd/app",
            CollectionKey = _instanceId.ToString(),
            CreatedAt = DateTimeOffset.UtcNow,
            OverallStatus = PersistentItemStatus.Failed,
            IsHead = false,
            Labels = Labels(),
            Steps =
            [
                new StepStatusResponse
                {
                    DatabaseId = Guid.NewGuid(),
                    OperationId = "NotifySignee",
                    ProcessingOrder = 0,
                    Command = new StepStatusResponse.CommandDetails { Type = "app" },
                    Status = PersistentItemStatus.Failed,
                    RetryCount = 2,
                    ErrorHistory =
                    [
                        new ErrorEntry(
                            DateTimeOffset.UtcNow,
                            "private recipient details",
                            retryExhausted ? 500 : 422,
                            false
                        ),
                    ],
                },
            ],
        };
}

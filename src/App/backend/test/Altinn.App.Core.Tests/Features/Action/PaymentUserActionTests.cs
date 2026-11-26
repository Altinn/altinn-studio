using Altinn.App.Core.Features.Action;
using Altinn.App.Core.Features.Payment.Models;
using Altinn.App.Core.Features.Payment.Services;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Models.Process;
using Altinn.App.Core.Models.UserAction;
using Altinn.App.Core.Tests.Internal.Process.TestUtils;
using Altinn.App.Tests.Common.Fixtures;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Altinn.App.Core.Tests.Features.Action;

public class PaymentUserActionTests
{
    private const string TaskId = "Task2";
    private static readonly StorageVersionMetadata _readVersions = new(InstanceVersion: 7, ProcessStateVersion: 3);

    private readonly MockedServiceCollection _fixture = new();
    private readonly Mock<IPaymentService> _paymentService = new(MockBehavior.Strict);
    private readonly Mock<IProcessEngine> _processEngine = new(MockBehavior.Strict);
    private readonly Instance _instance = new()
    {
        Id = "500000/b194e9f5-02d0-41bc-8461-a0cbac8a6efc",
        AppId = "ttd/mocked-app",
        InstanceOwner = new InstanceOwner { PartyId = "500000" },
        Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = TaskId } },
        Data = [],
    };

    public PaymentUserActionTests() => _fixture.Storage.AddInstance(_instance);

    [Fact]
    public async Task Pay_StartsThePaymentAttemptFromTheVersionsTheRequestRead()
    {
        SetupStart(new ActionPipelineOutcome.Moved(After()));

        await Pay();

        _processEngine.Verify(engine =>
            engine.StartActionPipeline(_instance, _readVersions, "pay", "en", It.IsAny<CancellationToken>())
        );
    }

    // What pay answers for each way the attempt can leave the instance, always with the instance the attempt left.
    [Theory]
    [InlineData("open", PaymentStatus.Created, "redirect", null, null)]
    [InlineData("open", PaymentStatus.Authorized, "success", null, null)]
    [InlineData("moved", null, "success", null, null)]
    [InlineData("released", null, "failure", "PaymentNotStarted", ProcessErrorType.Internal)]
    [InlineData("concurrentTransition", null, "failure", "ConcurrentTransition", ProcessErrorType.Conflict)]
    [InlineData("workflowFailed", null, "failure", "WorkflowFailed", ProcessErrorType.Internal)]
    public async Task Pay_AnswersHowTheAttemptLeftTheInstance(
        string start,
        PaymentStatus? recordStatus,
        string resultType,
        string? errorCode,
        ProcessErrorType? errorType
    )
    {
        InstanceWithStorageMetadata after = After();
        SetupStart(
            start switch
            {
                "open" => new ActionPipelineOutcome.Open(after),
                "moved" => new ActionPipelineOutcome.Moved(after),
                "released" => new ActionPipelineOutcome.Released(after),
                "concurrentTransition" => new ActionPipelineOutcome.Refused(
                    new ProcessChangeResult(after.Instance, after.Metadata)
                    {
                        Success = false,
                        ErrorType = ProcessErrorType.Conflict,
                        ProcessNextState = ProcessNextState.ConcurrentTransition,
                    }
                ),
                "workflowFailed" => new ActionPipelineOutcome.Refused(
                    new ProcessChangeResult(after.Instance, after.Metadata)
                    {
                        Success = false,
                        ErrorType = ProcessErrorType.Internal,
                        WorkflowFailure = new WorkflowFailure { Kind = WorkflowFailureKind.StepFailed },
                    }
                ),
                _ => throw new ArgumentOutOfRangeException(nameof(start), start, null),
            }
        );
        if (recordStatus is { } status)
        {
            _paymentService
                .Setup(s =>
                    s.GetPaymentInformation(
                        after.Instance,
                        It.IsAny<ValidAltinnPaymentConfiguration>(),
                        TaskId,
                        "en",
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(
                    new PaymentInformation
                    {
                        TaskId = TaskId,
                        Status = status,
                        OrderDetails = new OrderDetails
                        {
                            PaymentProcessorId = "paymentProcessorId",
                            Currency = "NOK",
                            OrderLines = [],
                            Receiver = new PaymentReceiver(),
                        },
                        PaymentDetails = new PaymentDetails { PaymentId = "1", RedirectUrl = "https://checkout" },
                    }
                );
        }

        UserActionResult result = await Pay();

        string actualType = result switch
        {
            { ResultType: ResultType.Failure } => "failure",
            { RedirectUrl: not null } => "redirect",
            _ => "success",
        };
        Assert.Equal(resultType, actualType);
        Assert.Equal(errorCode, result.Error?.Code);
        Assert.Equal(errorType, result.ResultType == ResultType.Failure ? result.ErrorType : null);
        Assert.Same(after.Instance, result.UpdatedInstance?.Instance);
        if (actualType == "redirect")
        {
            Assert.Equal(new Uri("https://checkout"), result.RedirectUrl);
        }
    }

    private InstanceWithStorageMetadata After() =>
        new(
            new Instance { Id = _instance.Id, Process = _instance.Process },
            _readVersions with
            {
                InstanceVersion = 9,
            }
        );

    private void SetupStart(ActionPipelineOutcome start) =>
        _processEngine
            .Setup(engine =>
                engine.StartActionPipeline(
                    It.IsAny<Instance>(),
                    It.IsAny<StorageVersionMetadata>(),
                    "pay",
                    It.IsAny<string?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(start);

    private async Task<UserActionResult> Pay()
    {
        await using WrappedServiceProvider sp = _fixture.BuildServiceProvider();
        InstanceDataUnitOfWork dataMutator = await sp.GetRequiredService<InstanceDataUnitOfWorkInitializer>()
            .Init(_instance, _readVersions, TaskId, "en");
        IProcessReader processReader = ProcessTestUtils.SetupProcessReader(
            "payment-task-process.bpmn",
            Path.Join("Features", "Action", "TestData")
        );
        var userAction = new PaymentUserAction(
            processReader,
            _paymentService.Object,
            _processEngine.Object,
            NullLogger<PaymentUserAction>.Instance
        );
        return await userAction.HandleAction(new UserActionContext(dataMutator, 1337, language: "en"));
    }
}

using Altinn.App.Core.Features.Payment.Models;
using Altinn.App.Core.Features.Payment.Services;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Models.Process;
using Altinn.App.Core.Models.UserAction;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Features.Action;

/// <summary>
/// User action for payment: starts a payment attempt, and answers once it is open, has moved the process or has ended.
/// </summary>
internal class PaymentUserAction : IUserAction
{
    private readonly IProcessReader _processReader;
    private readonly ILogger<PaymentUserAction> _logger;
    private readonly IPaymentService _paymentService;
    private readonly IProcessEngine _processEngine;

    /// <summary>
    /// Initializes a new instance of the <see cref="PaymentUserAction"/> class
    /// </summary>
    public PaymentUserAction(
        IProcessReader processReader,
        IPaymentService paymentService,
        IProcessEngine processEngine,
        ILogger<PaymentUserAction> logger
    )
    {
        _processReader = processReader;
        _paymentService = paymentService;
        _processEngine = processEngine;
        _logger = logger;
    }

    /// <inheritdoc />
    public string Id => PaymentProcessTask.PayAction;

    /// <inheritdoc />
    public async Task<UserActionResult> HandleAction(UserActionContext context)
    {
        if (
            _processReader.GetFlowElement(context.Instance.Process.CurrentTask.ElementId) is not ProcessTask currentTask
        )
        {
            return UserActionResult.FailureResult(
                new ActionError() { Code = "NoProcessTask", Message = "Current task is not a process task." }
            );
        }

        _logger.LogInformation(
            "Payment action handler invoked for instance {Id}. In task: {CurrentTaskId}",
            context.Instance.Id,
            currentTask.Id
        );

        AltinnPaymentConfiguration? paymentConfiguration = currentTask
            .ExtensionElements
            ?.TaskExtension
            ?.PaymentConfiguration;
        if (paymentConfiguration == null)
        {
            throw new ApplicationConfigException("PaymentConfig is missing in the payment process task configuration.");
        }

        ActionPipelineOutcome outcome = await _processEngine.StartActionPipeline(
            context.Instance,
            context.DataMutator is InstanceDataUnitOfWork unitOfWork
                ? unitOfWork.StorageVersions
                : throw new InvalidOperationException(
                    "The pay action needs the request's unit of work, which knows the Storage versions it read."
                ),
            Id,
            context.Language,
            context.CancellationToken
        );

        UserActionResult result;
        switch (outcome)
        {
            case ActionPipelineOutcome.Open open:
                PaymentInformation payment = await _paymentService.GetPaymentInformation(
                    open.Instance.Instance,
                    paymentConfiguration.Validate(),
                    currentTask.Id,
                    context.Language,
                    context.CancellationToken
                );
                result = payment is { Status: PaymentStatus.Created, PaymentDetails.RedirectUrl: { } redirectUrl }
                    ? UserActionResult.RedirectResult(new Uri(redirectUrl))
                    : UserActionResult.SuccessResult();
                result.UpdatedInstance = open.Instance;
                return result;

            case ActionPipelineOutcome.Moved moved:
                result = UserActionResult.SuccessResult();
                result.UpdatedInstance = moved.Instance;
                return result;

            case ActionPipelineOutcome.Released released:
                result = UserActionResult.FailureResult(
                    new ActionError
                    {
                        Code = "PaymentNotStarted",
                        Message = "The payment could not be started at the payment processor.",
                    }
                );
                result.UpdatedInstance = released.Instance;
                return result;

            case ActionPipelineOutcome.Refused { Result: var refusal }:
                result = UserActionResult.FailureResult(
                    new ActionError
                    {
                        Code = GetRefusalCode(refusal),
                        Message = refusal.ErrorMessage ?? "The payment attempt did not start.",
                    },
                    errorType: refusal.ErrorType ?? ProcessErrorType.Internal
                );
                if (refusal.MutatedInstance is { } current)
                {
                    result.UpdatedInstance = new InstanceWithStorageMetadata(current, refusal.MutatedInstanceVersions);
                }
                return result;

            default:
                throw new InvalidOperationException($"Unexpected action pipeline outcome {outcome.GetType().Name}.");
        }
    }

    private static string GetRefusalCode(ProcessChangeResult refusal) =>
        refusal switch
        {
            { WorkflowFailure: not null } => "WorkflowFailed",
            { ProcessNextState: { } processNextState } => processNextState.ToString(),
            // The instance became held between the action's own status check and the start.
            { BlockingProcessStatus: not null } => nameof(ProcessNextState.Retrying),
            _ => "PaymentNotStarted",
        };
}

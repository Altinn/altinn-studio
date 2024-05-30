using Altinn.App.Core.Features.Payment.Models;
using Altinn.App.Core.Features.Payment.Services;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Models.Process;
using Altinn.App.Core.Models.UserAction;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Features.Action;

/// <summary>
/// User action for payment
/// </summary>
internal class PaymentUserAction : IUserAction
{
    private readonly IProcessReader _processReader;
    private readonly ILogger<PaymentUserAction> _logger;
    private readonly IPaymentService _paymentService;

    /// <summary>
    /// Initializes a new instance of the <see cref="PaymentUserAction"/> class
    /// </summary>
    public PaymentUserAction(
        IProcessReader processReader,
        IPaymentService paymentService,
        ILogger<PaymentUserAction> logger
    )
    {
        _processReader = processReader;
        _paymentService = paymentService;
        _logger = logger;
    }

    /// <inheritdoc />
    public string Id => "pay";

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

        (PaymentInformation paymentInformation, bool alreadyPaid) = await _paymentService.StartPayment(
            context.Instance,
            paymentConfiguration.Validate(),
            context.Language
        );

        if (alreadyPaid)
        {
            return UserActionResult.FailureResult(
                error: new ActionError { Code = "PaymentAlreadyCompleted", Message = "Payment already completed." },
                errorType: ProcessErrorType.Conflict
            );
        }

        string? paymentDetailsRedirectUrl = paymentInformation.PaymentDetails?.RedirectUrl;

        return paymentDetailsRedirectUrl == null
            ? UserActionResult.SuccessResult()
            : UserActionResult.RedirectResult(new Uri(paymentDetailsRedirectUrl));
    }
}

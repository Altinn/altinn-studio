using System.Diagnostics;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features.Payment;
using Altinn.App.Core.Features.Payment.Models;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Validation;

namespace Altinn.App.Core.Features.Validation.Default;

/// <summary>
/// Default validator for payment tasks. Validates that the payment is paid, or skipped because the order costs nothing.
/// </summary>
/// <remarks>
/// It reads the stored payment status, which is only set to paid from the payment processor's own answer. A
/// process/next it refuses leaves the instance idle, so the paid status can still be stored and the task completed.
/// The payment task checks the same when it ends, but in a workflow engine step, where a failure leaves the instance
/// stuck.
/// </remarks>
internal sealed class PaymentTaskValidator : IValidator
{
    private readonly IProcessReader _processReader;

    /// <summary>
    /// Initializes a new instance of the <see cref="PaymentTaskValidator"/> class.
    /// </summary>
    public PaymentTaskValidator(IProcessReader processReader)
    {
        _processReader = processReader;
    }

    /// <summary>
    /// We implement <see cref="ShouldRunForTask"/> instead.
    /// </summary>
    public string TaskId => "*";

    /// <summary>
    /// Only runs for tasks that are of type "payment".
    /// </summary>
    public bool ShouldRunForTask(string taskId) =>
        _processReader.GetFlowElement(taskId)
            is ProcessTask
            {
                ExtensionElements.TaskExtension: { TaskType: AltinnTaskTypes.Payment, PaymentConfiguration: not null },
            };

    public bool NoIncrementalValidation => true;

    /// <inheritdoc />
    public Task<bool> HasRelevantChanges(IInstanceDataAccessor dataAccessor, string taskId, DataElementChanges changes)
    {
        throw new UnreachableException(
            "HasRelevantChanges should not be called because NoIncrementalValidation is true."
        );
    }

    /// <inheritdoc />
    /// <remarks>Validates that the stored payment is paid or skipped.</remarks>
    public async Task<List<ValidationIssue>> Validate(
        IInstanceDataAccessor dataAccessor,
        string taskId,
        string? language
    )
    {
        ValidAltinnPaymentConfiguration paymentConfiguration = (
            _processReader.GetAltinnTaskExtension(taskId)?.PaymentConfiguration
            ?? throw new ApplicationConfigException(
                "PaymentConfig is missing in the payment process task configuration."
            )
        ).Validate();

        StoredPaymentInformation? storedPayment = await StoredPaymentInformation.Read(
            dataAccessor,
            paymentConfiguration.PaymentDataType
        );

        if (storedPayment?.PaymentInformation.Status is PaymentStatus.Paid or PaymentStatus.Skipped)
        {
            return [];
        }

        return [BuiltInValidationIssues.PaymentNotCompleted(paymentConfiguration.PaymentDataType)];
    }
}

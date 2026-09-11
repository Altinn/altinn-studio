using System.Text.Json;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Payment.Exceptions;
using Altinn.App.Core.Features.Payment.Models;
using Altinn.App.Core.Features.Payment.Processors;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Process.ProcessTasks.Payment;

/// <summary>
/// Cancels and removes any earlier, unpaid payment of the task, so the task starts (or is left) without one.
/// Declared by the payment task for both its start and its abandon phase.
/// </summary>
internal sealed class CleanupPaymentCommand : WorkflowEngineCommandBase<ProcessTaskPayload>
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new(JsonSerializerDefaults.Web);

    public static string Key => "CleanupPayment";

    private readonly IProcessReader _processReader;
    private readonly AppImplementationFactory _appImplementationFactory;

    public CleanupPaymentCommand(IProcessReader processReader, AppImplementationFactory appImplementationFactory)
    {
        _processReader = processReader;
        _appImplementationFactory = appImplementationFactory;
    }

    /// <inheritdoc/>
    public override string GetKey() => Key;

    /// <inheritdoc/>
    public override async Task<ProcessEngineCommandResult> Execute(
        ProcessEngineCommandContext context,
        ProcessTaskPayload payload
    )
    {
        IInstanceDataMutator dataMutator = context.InstanceDataMutator;
        ValidAltinnPaymentConfiguration paymentConfiguration = PaymentTaskConfiguration.Get(
            _processReader,
            payload.TaskId
        );

        DataElement? paymentDataElement = dataMutator
            .GetDataElementsForType(paymentConfiguration.PaymentDataType)
            .SingleOrDefault();
        if (paymentDataElement is null)
        {
            return ProcessEngineCommandResult.Completed();
        }

        ReadOnlyMemory<byte> paymentData = await dataMutator.GetBinaryData(paymentDataElement);
        PaymentInformation paymentInformation =
            JsonSerializer.Deserialize<PaymentInformation>(paymentData.Span, _jsonSerializerOptions)
            ?? throw new InvalidOperationException("Unable to deserialize stored payment information.");

        if (paymentInformation.Status == PaymentStatus.Paid)
        {
            return ProcessEngineCommandResult.Completed();
        }

        if (paymentInformation.Status != PaymentStatus.Skipped)
        {
            string paymentProcessorId = paymentInformation.OrderDetails.PaymentProcessorId;
            IPaymentProcessor paymentProcessor =
                _appImplementationFactory
                    .GetAll<IPaymentProcessor>()
                    .FirstOrDefault(pp => pp.PaymentProcessorId == paymentProcessorId)
                ?? throw new PaymentException($"Payment processor with ID '{paymentProcessorId}' not found.");

            bool success = await paymentProcessor.TerminatePayment(dataMutator.Instance, paymentInformation);
            string paymentId = paymentInformation.PaymentDetails?.PaymentId ?? "missing";
            if (!success)
            {
                throw new PaymentException(
                    $"Unable to cancel existing {paymentProcessorId} payment with ID: {paymentId}."
                );
            }
        }

        dataMutator.RemoveDataElement(paymentDataElement);
        return ProcessEngineCommandResult.Completed();
    }
}

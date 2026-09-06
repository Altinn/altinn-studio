using Altinn.App.Core.Constants;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Process.ProcessTasks.Payment;
using Microsoft.Extensions.Hosting;

namespace Altinn.App.Core.Internal.Process.ProcessTasks;

/// <summary>
/// Represents the process task responsible for collecting user payment.
/// </summary>
/// <remarks>
/// Declares its work as commands: any earlier payment is cleaned up when the task is entered and when it is
/// abandoned, and the payment is verified and its receipt generated when the task is ended.
/// </remarks>
internal sealed class PaymentProcessTask : IProcessTask
{
    private readonly IProcessReader _processReader;
    private readonly IHostEnvironment _hostEnvironment;

    /// <summary>
    /// Initializes a new instance of the <see cref="PaymentProcessTask"/> class.
    /// </summary>
    public PaymentProcessTask(IProcessReader processReader, IHostEnvironment hostEnvironment)
    {
        _processReader = processReader;
        _hostEnvironment = hostEnvironment;
    }

    /// <inheritdoc/>
    public string Type => AltinnTaskTypes.Payment;

    /// <inheritdoc/>
    public IEnumerable<string> ValidateConfiguration(ProcessTaskValidationContext context)
    {
        ValidAltinnPaymentConfiguration? paymentConfiguration = null;
        string? configurationFinding = null;
        try
        {
            paymentConfiguration = PaymentTaskConfiguration.Get(_processReader, context.TaskId);
        }
        catch (ApplicationConfigException e)
        {
            configurationFinding = $"Task '{context.TaskId}': {e.Message}";
        }

        if (configurationFinding is not null || paymentConfiguration is null)
        {
            yield return configurationFinding ?? $"Task '{context.TaskId}': payment configuration is missing.";
            yield break;
        }

        // The payment data type should be app owned, so that the end user can't manipulate the data. Tell the
        // developer during development if this is not the case.
        if (_hostEnvironment.IsDevelopment())
        {
            string? finding = null;
            try
            {
                AllowedContributorsHelper.EnsureDataTypeIsAppOwned(
                    context.ApplicationMetadata,
                    paymentConfiguration.Value.PaymentDataType
                );
            }
            catch (ApplicationConfigException e)
            {
                finding = $"Task '{context.TaskId}': {e.Message}";
            }

            if (finding is not null)
            {
                yield return finding;
            }
        }
    }

    /// <inheritdoc/>
    public IReadOnlyList<ProcessTaskCommandRef> GetStartCommands(string taskId) =>
        [new ProcessTaskCommandRef(CleanupPaymentCommand.Key)];

    /// <inheritdoc/>
    public IReadOnlyList<ProcessTaskCommandRef> GetEndCommands(string taskId) =>
        [new ProcessTaskCommandRef(CompletePaymentCommand.Key)];

    /// <inheritdoc/>
    public IReadOnlyList<ProcessTaskCommandRef> GetAbandonCommands(string taskId) =>
        [new ProcessTaskCommandRef(CleanupPaymentCommand.Key)];
}

using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;

namespace Altinn.App.Core.Internal.Process.ProcessTasks.Payment;

/// <summary>
/// Reads and validates the payment configuration of a BPMN task, for the payment task and its commands.
/// </summary>
internal static class PaymentTaskConfiguration
{
    public static ValidAltinnPaymentConfiguration Get(IProcessReader processReader, string taskId)
    {
        AltinnPaymentConfiguration? paymentConfiguration = processReader
            .GetAltinnTaskExtension(taskId)
            ?.PaymentConfiguration;

        if (paymentConfiguration is null)
        {
            throw new ApplicationConfigException("PaymentConfig is missing in the payment process task configuration.");
        }

        return paymentConfiguration.Validate();
    }
}

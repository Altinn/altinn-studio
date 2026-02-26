using System.Diagnostics.CodeAnalysis;
using System.Xml.Serialization;
using Altinn.App.Core.Internal.App;

namespace Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;

/// <summary>
/// Configuration properties for payments in a process task
/// </summary>
public class AltinnPaymentConfiguration
{
    /// <summary>
    /// Set what dataTypeId that should be used for storing the payment
    /// </summary>
    [XmlElement("paymentDataType", Namespace = "http://altinn.no/process")]
    public string? PaymentDataType { get; set; }

    /// <summary>
    /// Set what dataTypeId that should be used for storing the payment receipt pdf
    /// </summary>
    [XmlElement("paymentReceiptPdfDataType", Namespace = "http://altinn.no/process")]
    public string? PaymentReceiptPdfDataType { get; set; }

    internal ValidAltinnPaymentConfiguration Validate()
    {
        List<string>? errorMessages = null;

        string? paymentDataType = PaymentDataType;
        string? paymentReceiptPdfDataType = PaymentReceiptPdfDataType;

        if (paymentDataType.IsNullOrWhitespace(ref errorMessages, "PaymentDataType is missing."))
            ThrowApplicationConfigException(errorMessages);

        if (paymentReceiptPdfDataType.IsNullOrWhitespace(ref errorMessages, "PaymentReceiptPdfDataType is missing."))
            ThrowApplicationConfigException(errorMessages);

        return new ValidAltinnPaymentConfiguration(paymentDataType, paymentReceiptPdfDataType);
    }

    [DoesNotReturn]
    private static void ThrowApplicationConfigException(List<string> errorMessages)
    {
        throw new ApplicationConfigException(
            "Payment process task configuration is not valid: " + string.Join(",\n", errorMessages)
        );
    }
}

internal readonly record struct ValidAltinnPaymentConfiguration(
    string PaymentDataType,
    string PaymentReceiptPdfDataType
);

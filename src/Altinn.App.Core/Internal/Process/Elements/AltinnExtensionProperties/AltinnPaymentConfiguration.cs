using System.Diagnostics.CodeAnalysis;
using System.Xml.Serialization;
using Altinn.App.Core.Internal.App;

namespace Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties
{
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

        internal ValidAltinnPaymentConfiguration Validate()
        {
            List<string>? errorMessages = null;

            var paymentDataType = PaymentDataType;

            if (paymentDataType.IsNullOrWhitespace(ref errorMessages, "PaymentDataType is missing."))
                ThrowApplicationConfigException(errorMessages);

            return new ValidAltinnPaymentConfiguration(paymentDataType);
        }

        [DoesNotReturn]
        private static void ThrowApplicationConfigException(List<string> errorMessages)
        {
            throw new ApplicationConfigException(
                "Payment process task configuration is not valid: " + string.Join(",\n", errorMessages)
            );
        }
    }

    internal readonly record struct ValidAltinnPaymentConfiguration(string PaymentDataType);

    file static class ValidationExtensions
    {
        internal static bool IsNullOrWhitespace(
            [NotNullWhen(false)] this string? value,
            [NotNullWhen(true)] ref List<string>? errors,
            string error
        )
        {
            var result = string.IsNullOrWhiteSpace(value);
            if (result)
            {
                errors ??= new List<string>(1);
                errors.Add(error);
            }
            return result;
        }
    }
}

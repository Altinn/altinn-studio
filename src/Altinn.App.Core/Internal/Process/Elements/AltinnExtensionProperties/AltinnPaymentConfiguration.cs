using System.Xml.Serialization;

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
    }
}

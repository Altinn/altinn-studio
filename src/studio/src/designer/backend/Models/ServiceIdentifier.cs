using System;

namespace Altinn.Studio.Designer.Models
{
    /// <summary>
    /// The service identifier.
    /// </summary>
    public class ServiceIdentifier : IEquatable<ServiceIdentifier>
    {
        /// <summary>  Gets or sets the org. </summary>
        public string Org { get; set; }

        /// <summary> Gets or sets the app. </summary>
        public string Service { get; set; }

        /// <summary> Asserts that org and app got values. </summary>
        public bool Ok => !string.IsNullOrWhiteSpace(Org) && !string.IsNullOrWhiteSpace(Service);

        /// <summary> Checks equality. Case insensitive. </summary>
        /// <param name="other"> The other. </param>
        /// <returns> The <see cref="bool"/>. </returns>
        public bool Equals(ServiceIdentifier other)
        {
            return Org != null && Service != null
                   && Org.Equals(other?.Org, StringComparison.CurrentCultureIgnoreCase)
                   && Service.Equals(other?.Service, StringComparison.CurrentCultureIgnoreCase);
        }

        /// <summary> String representation of object. </summary>
        /// <returns> The <see cref="string"/>. </returns>
        public override string ToString()
        {
            return $"ServiceIdentifier[{Org}, {Service}]";
        }
    }
}

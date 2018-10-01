namespace AltinnCore.Common.Models
{
    using System;

    /// <summary>
    /// The service edition identifier.
    /// </summary>
    public class ServiceEditionIdentifier : IEquatable<ServiceEditionIdentifier>
    {
        /// <summary>  Gets or sets the org. </summary>
        public string Org { get; set; }

        /// <summary> Gets or sets the service. </summary>
        public string Service { get; set; }

        /// <summary> Gets or sets the edition. </summary>
        public string Edition { get; set; }

        /// <summary> Asserts that Org, Service and Edition got values. </summary>
        public bool Ok => !string.IsNullOrWhiteSpace(Org) && !string.IsNullOrWhiteSpace(Service) && !string.IsNullOrWhiteSpace(Edition);

        /// <summary> Checks equality. Case insensitive. </summary>
        /// <param name="other"> The other. </param>
        /// <returns> The <see cref="bool"/>. </returns>
        public bool Equals(ServiceEditionIdentifier other)
        {
            return Org != null && Service != null && Edition != null
                   && Org.Equals(other?.Org, StringComparison.CurrentCultureIgnoreCase)
                   && Service.Equals(other?.Service, StringComparison.CurrentCultureIgnoreCase)
                   && Edition.Equals(other?.Edition, StringComparison.CurrentCultureIgnoreCase);
        }

        /// <summary> String representation of object. </summary>
        /// <returns> The <see cref="string"/>. </returns>
        public override string ToString()
        {
            return $"ServiceEditionIdentifier[{Org}, {Service}, {Edition}]";
        }
    }
}

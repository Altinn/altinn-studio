namespace Altinn.Authorization.ABAC.Xacml.JsonProfile
{
    /// <summary>
    /// Defines the Attribute Json object.
    /// </summary>
    public class XacmlJsonAttribute
    {
        /// <summary>
        /// Gets or sets the AttributeId. Required.
        /// </summary>
        public string AttributeId { get; set; }

        /// <summary>
        /// Gets or sets the value for the Attribute. Required.
        /// </summary>
        public string Value { get; set; }

        /// <summary>
        /// Gets or sets the issuer of the attribute. Optional.
        /// </summary>
        public string Issuer { get; set; }

        /// <summary>
        /// Gets or sets the datatype of the attribute. Optional in some cases.
        /// </summary>
        public string DataType { get; set; }

        /// <summary>
        /// Gets or sets a value indicating whether the attribute should be returned in the result.
        /// </summary>
        public bool IncludeInResult { get; set; }
    }
}

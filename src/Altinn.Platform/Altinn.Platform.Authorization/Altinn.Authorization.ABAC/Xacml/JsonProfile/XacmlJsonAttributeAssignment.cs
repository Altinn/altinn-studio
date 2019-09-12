namespace Altinn.Authorization.ABAC.Xacml.JsonProfile
{
    /// <summary>
    /// Json reprentation of Attribute assignment returned.
    /// </summary>
    public class XacmlJsonAttributeAssignment
    {
        /// <summary>
        /// Gets or sets a string containing a XACML attribute URI. Mandatory.
        /// </summary>
        public string AttributeId { get; set; }

        /// <summary>
        /// Gets or sets the value. Mandatory.
        /// </summary>
        public string Value { get; set; }

        /// <summary>
        /// Gets or sets a string containing a XACML category URI or the shorthand notation defined in section 4.2.2.1.
        /// </summary>
        public string Category { get; set; }

        /// <summary>
        /// Gets or sets the datattype of the attribute.
        /// </summary>
        public string DataType { get; set; }

        /// <summary>
        ///  Gets or sets the issuer of the attribute. Optional.
        /// </summary>
        public string Issuer { get; set; }
    }
}

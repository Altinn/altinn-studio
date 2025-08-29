namespace Altinn.Studio.DataModeling.Utils
{
    /// <summary>
    /// Known XML namespaces used in the xml schema converters
    /// </summary>
    public static class KnownXmlNamespaces
    {
        /// <summary>
        /// General xml schema namespace
        /// </summary>
        public const string XmlSchemaNamespace = "http://www.w3.org/2001/XMLSchema";

        /// <summary>
        /// Xml schema instance namespace
        /// </summary>
        public const string XmlSchemaInstanceNamespace = "http://www.w3.org/2001/XMLSchema-instance";

        /// <summary>
        /// Namespaces used for SERES xml schemas
        /// </summary>
        public const string SERES = "http://seres.no/xsd/forvaltningsdata";

        /// <summary>
        /// Namespaces used for brreg OR xml schemas
        /// </summary>
        public const string OR = "http://www.brreg.no/or";

        /// <summary>
        /// Namespaces used for skatt xml schemas
        /// </summary>
        public const string Skatt = "http://www.skatteetaten.no/xsd";
    }
}

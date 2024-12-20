using System;

namespace Altinn.Studio.DataModeling.Converter.Xml
{
    /// <summary>
    /// Represents errors thrown when converting from XSD to Json Schema.
    /// </summary>
    [Serializable]
    public class XmlSchemaConvertException : Exception
    {
        /// <summary>
        /// <inheritdoc/>
        /// </summary>
        public XmlSchemaConvertException() : base()
        {
        }

        /// <summary>
        /// <inheritdoc/>
        /// </summary>
        public XmlSchemaConvertException(string message) : base(message)
        {
        }

        /// <summary>
        /// <inheritdoc/>
        /// </summary>
        public XmlSchemaConvertException(string message, Exception innerException) : base(message, innerException)
        {
        }
    }
}

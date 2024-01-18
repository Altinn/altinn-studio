using System;
using System.Collections.Generic;
using System.Runtime.Serialization;

namespace Altinn.Studio.DataModeling.Converter.Xml
{
    /// <summary>
    /// Represents errors thrown when converting from XSD to Json Schema.
    /// </summary>
    [Serializable]
    public class XmlSchemaConvertException : Exception
    {

        public List<string> CustomErrorMessages { get; }

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

        public XmlSchemaConvertException(string message, List<string> customErrorMessages) : base(message)
        {
            CustomErrorMessages = customErrorMessages;
        }

        /// <summary>
        /// <inheritdoc/>
        /// </summary>
        public XmlSchemaConvertException(string message, Exception innerException) : base(message, innerException)
        {
        }

        /// <summary>
        /// <inheritdoc/>
        /// </summary>
        protected XmlSchemaConvertException(SerializationInfo info, StreamingContext context) : base(info, context)
        {
        }
    }
}

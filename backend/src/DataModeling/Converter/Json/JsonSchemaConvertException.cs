using System;

namespace Altinn.Studio.DataModeling.Converter.Json
{
    /// <summary>
    /// Represents errors thrown when converting from Json Schema to XSD.
    /// </summary>
    [Serializable]
    public class JsonSchemaConvertException : Exception
    {
        /// <summary>
        /// <inheritdoc/>
        /// </summary>
        public JsonSchemaConvertException() : base()
        {
        }

        /// <summary>
        /// <inheritdoc/>
        /// </summary>
        public JsonSchemaConvertException(string message) : base(message)
        {
        }

        /// <summary>
        /// <inheritdoc/>
        /// </summary>
        public JsonSchemaConvertException(string message, Exception innerException) : base(message, innerException)
        {
        }
    }
}

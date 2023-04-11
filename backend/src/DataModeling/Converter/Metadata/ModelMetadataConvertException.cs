using System;
using System.Runtime.Serialization;

namespace Altinn.Studio.DataModeling.Converter.Metadata
{
    /// <summary>
    /// Represents errors thrown when converting from Json Schema to ModelMetadata.
    /// </summary>
    [Serializable]
    public class MetamodelConvertException : Exception
    {
        /// <inheritdoc/>
        public MetamodelConvertException()
        {
        }

        /// <inheritdoc/>
        public MetamodelConvertException(string message) : base(message)
        {
        }

        /// <inheritdoc/>
        public MetamodelConvertException(string message, Exception innerException) : base(message, innerException)
        {
        }

        /// <inheritdoc/>
        protected MetamodelConvertException(SerializationInfo info, StreamingContext context) : base(info, context)
        {
        }
    }
}

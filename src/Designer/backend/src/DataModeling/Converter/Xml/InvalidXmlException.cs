using System;
using System.Collections.Generic;

namespace Altinn.Studio.DataModeling.Converter.Xml
{


    /// <summary>
    /// Represents errors thrown when converting from XSD to Json Schema.
    /// </summary>
    [Serializable]
    public class InvalidXmlException : Exception
    {

        public List<string> CustomErrorMessages { get; }

        /// <summary>
        /// <inheritdoc/>
        /// </summary>
        public InvalidXmlException() : base()
        {
        }

        /// <summary>
        /// <inheritdoc/>
        /// </summary>
        public InvalidXmlException(string message) : base(message)
        {
        }

        public InvalidXmlException(string message, List<string> customErrorMessages) : base(message)
        {
            CustomErrorMessages = customErrorMessages;
        }
    }
}

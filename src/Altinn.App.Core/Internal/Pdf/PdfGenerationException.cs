using System.Runtime.Serialization;

namespace Altinn.App.Core.Internal.Pdf
{
    /// <summary>
    /// Class representing an exception throw when a PDF could not be created.
    /// </summary>
    [Serializable]
    public class PdfGenerationException : Exception
    {
        /// <summary>
        /// Creates a new Exception of <see cref="PdfGenerationException"/>
        /// Intended to be used when the generation of PDF fails.
        /// </summary>
        public PdfGenerationException()
        {
        }

        /// <summary>
        /// Creates a new Exception of <see cref="PdfGenerationException"/>
        /// Intended to be used when the generation of PDF fails.
        /// </summary>
        public PdfGenerationException(string? message) : base(message)
        {
        }

        /// <summary>
        /// Creates a new Exception of <see cref="PdfGenerationException"/>
        /// Intended to be used when the generation of PDF fails.
        /// </summary>
        public PdfGenerationException(string? message, Exception? innerException) : base(message, innerException)
        {
        }

        /// <summary>
        /// Creates a new Exception of <see cref="PdfGenerationException"/>
        /// Intended to be used when the generation of PDF fails.
        /// </summary>
        protected PdfGenerationException(SerializationInfo info, StreamingContext context) : base(info, context)
        {
        }
    }
}

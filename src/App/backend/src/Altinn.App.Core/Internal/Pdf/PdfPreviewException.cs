namespace Altinn.App.Core.Internal.Pdf;

/// <summary>
/// Thrown when a PDF preview request cannot be resolved to a renderable target, e.g. an unknown task id
/// or a data element that does not belong to the requested subform PDF task. The API layer catches this
/// and maps it to a problem details response using <see cref="StatusCode"/>.
/// </summary>
internal sealed class PdfPreviewException : Exception
{
    /// <summary>
    /// The HTTP status code the controller should respond with for this failure.
    /// </summary>
    public int StatusCode { get; }

    /// <summary>
    /// Initializes a new instance of the <see cref="PdfPreviewException"/> class.
    /// </summary>
    /// <param name="statusCode">The HTTP status code the controller should respond with.</param>
    /// <param name="message">A message describing why the preview request could not be resolved.</param>
    public PdfPreviewException(int statusCode, string message)
        : base(message)
    {
        StatusCode = statusCode;
    }
}

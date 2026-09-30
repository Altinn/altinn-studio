using Altinn.App.Core.Features;

namespace Altinn.App.Core.Internal.Pdf;

/// <summary>
/// Gets the file name for a PDF from <see cref="IPdfService"/>, for when the PDF is added to the instance.
/// </summary>
public interface IPdfFileNameResolver
{
    /// <summary>
    /// Get the file name for a PDF of the instance. The file name ends with .pdf.
    /// </summary>
    /// <param name="dataAccessor">The instance data accessor to fill in the variables of the file name's text resource from.</param>
    /// <param name="customFileNameTextResourceKey">A text resource key for the file name. If null, or no text resource has the key, a default file name is used.</param>
    /// <param name="subformPdfContext">The subform the PDF is of, so the variables of the file name come from the subform's data, or null for a PDF of a task.</param>
    Task<string> GetFileName(
        IInstanceDataAccessor dataAccessor,
        string? customFileNameTextResourceKey = null,
        SubformPdfContext? subformPdfContext = null
    );
}

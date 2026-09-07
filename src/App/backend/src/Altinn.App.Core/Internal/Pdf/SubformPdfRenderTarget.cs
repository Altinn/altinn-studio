namespace Altinn.App.Core.Internal.Pdf;

/// <summary>
/// A resolved subform PDF target, independent of the task or component that references the UI folder.
/// </summary>
internal sealed record SubformPdfRenderTarget(string UiFolder, string DataType, string DataElementId);

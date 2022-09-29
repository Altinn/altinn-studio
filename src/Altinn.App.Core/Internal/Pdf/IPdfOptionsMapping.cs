namespace Altinn.App.Core.Internal.Pdf;

/// <summary>
/// Interface for handling mapping dynamic options to PdfService
/// </summary>
public interface IPdfOptionsMapping
{
    /// <summary>
    /// Returns dictinary with options mapping for pdf generation
    /// </summary>
    /// <param name="formLayout">formlayout to generate mapping for</param>
    /// <param name="language">language to fetch mappings for</param>
    /// <param name="data">instance data</param>
    /// <param name="instanceId">id of instance</param>
    /// <returns></returns>
    public Task<Dictionary<string, Dictionary<string, string>>> GetOptionsDictionary(string formLayout,
        string language, object data, string instanceId);
}
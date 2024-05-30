namespace Altinn.App.Core.Internal.Language;

/// <summary>
/// Interface for retrieving languages supported by the application.
/// </summary>
public interface IApplicationLanguage
{
    /// <summary>
    /// Gets the supported languages from the application located in the text resource folder.
    /// </summary>
    /// <returns>Returns a list of the supported languages</returns>
    Task<List<Models.ApplicationLanguage>> GetApplicationLanguages();
}

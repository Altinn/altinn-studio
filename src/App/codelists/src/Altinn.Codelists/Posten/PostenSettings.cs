namespace Altinn.Codelists.Posten;

/// <summary>
/// Options to control the behavior of <see cref="IPostalCodesClient"/>
/// </summary>
public class PostenSettings
{
    internal static readonly string DefaultBaseUrl = "https://www.bring.no";
    internal static readonly string DefaultPath = "/postnummerregister-ansi.txt";

    /// <summary>
    /// URL to Brings postnummerregister API
    /// </summary>
    public string Url { get; set; } = $"{DefaultBaseUrl}{DefaultPath}";
}

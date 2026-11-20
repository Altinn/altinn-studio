namespace Altinn.Studio.Designer.Constants;

/// <summary>
/// app token
/// </summary>
public static class General
{
    /// <summary>
    /// The name of the cookie used for asp authentication in designer application
    /// </summary>
    public const string DesignerCookieName = "AltinnStudioDesigner";

    /// <summary>
    /// The identifying name for a custom receipt at process end in the application
    /// </summary>
    public const string CustomReceiptId = "CustomReceipt";

    /// <summary>
    /// The name of subforms in the application
    /// </summary>
    public const string SubformId = "subform";

    /// <summary>
    /// The name of the default branch used by Gitea
    /// </summary>
    public const string DefaultBranch = "master";

    /// <summary>
    /// The domain of the address that Studio commits with, in the developer's name. It tells the commits made in Studio
    /// apart from commits made elsewhere.
    /// </summary>
    public const string StudioCommitEmailDomain = "noreply.altinn.studio";
}

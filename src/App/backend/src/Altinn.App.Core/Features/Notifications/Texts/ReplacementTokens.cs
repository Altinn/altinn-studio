namespace Altinn.App.Core.Features.Notifications.Texts;

/// <summary>
/// Defines the replacement tokens that can be used in custom notification texts.
/// </summary>
public static class ReplacementTokens
{
    /// <summary>
    /// The name of the app, as defined in the app metadata.
    /// </summary>
    public const string AppName = "$appName$";

    /// <summary>
    /// The name of the instance owner
    /// </summary>
    public const string InstanceOwnerName = "$instanceOwnerName$";

    /// <summary>
    /// The name of the service owner, as defined in the Altinn CDN.
    /// Will be null if the service owner is not registered in the Altinn CDN or if there was an error retrieving the information.
    /// </summary>
    public const string ServiceOwnerName = "$serviceOwnerName$";

    /// <summary>
    /// The organization number of the instance owner, if the instance owner is an organization.
    /// </summary>
    public const string OrgNumber = "$orgNumber$";

    /// <summary>
    /// The national identity number of the instance owner, if the instance owner is an individual.
    /// </summary>
    public const string NationalIdentityNumber = "$personNumber$";

    /// <summary>
    /// The national identity number of the instance owner, if the instance owner is an individual.
    /// </summary>
    public const string SocialSecurityNumber = "$socialSecurityNumber$";

    /// <summary>
    /// The due date of the instance, if a due date is set.
    /// </summary>
    public const string DueDate = "$dueDate$";
}

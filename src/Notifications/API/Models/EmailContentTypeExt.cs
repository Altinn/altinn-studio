#nullable enable
namespace Altinn.Notifications.Models;

/// <summary>
/// Enum describing available content types for an email.
/// </summary>
public enum EmailContentTypeExt
{
    /// <summary>
    /// The email format is plain text.
    /// </summary>
    Plain,

    /// <summary>
    /// The email contains HTML elements
    /// </summary>
    Html
}

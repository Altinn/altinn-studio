#nullable enable
namespace Altinn.Notifications.Core.Models;

/// <summary>
/// A class representing a notification creator 
/// </summary>
public class Creator
{
    /// <summary>
    /// Gets the short name of the creator
    /// </summary>
    public string ShortName { get; internal set; }

    /// <summary>
    /// Initializes a new instance of the <see cref="Creator"/> class.
    /// </summary>
    public Creator(string shortName)
    {
        ShortName = shortName;
    }
}

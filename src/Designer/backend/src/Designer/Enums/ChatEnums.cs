namespace Altinn.Studio.Designer.Enums;

/// <summary>
/// The author role of a chat message.
/// </summary>
public enum Role
{
    User = 0,
    Assistant = 1,
}

/// <summary>
/// Controls how the assistant should act on the user's request.
/// </summary>
public enum ActionMode
{
    Auto = 0,
    Ask = 1,
    Edit = 2,
}

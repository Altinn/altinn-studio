namespace Altinn.Studio.Common.Domain.App;

/// <summary>
/// What only apps on v9 or later have. Their <c>App/ui</c> has a folder per task, each with its own
/// <c>Settings.json</c>, where earlier apps listed layout sets in <c>App/ui/layout-sets.json</c>.
/// </summary>
public sealed record V9Description
{
    internal V9Description(ValueList<string> uiFolders)
    {
        UiFolders = uiFolders;
    }

    /// <summary>The folders under <c>App/ui</c> with a <c>Settings.json</c>, in ordinal order.</summary>
    public ValueList<string> UiFolders { get; }
}

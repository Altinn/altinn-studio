namespace Altinn.Studio.Common.App.V9;

/// <summary>
/// What only apps on v9 or later have. Their <c>App/ui</c> has a folder per task, each with its own
/// <c>Settings.json</c>, where earlier apps listed layout sets in <c>App/ui/layout-sets.json</c>, and the backend
/// serves the frontend itself rather than from <c>App/views/Home/Index.cshtml</c>.
/// </summary>
/// <param name="UiFolders">The folders under <c>App/ui</c> with a <c>Settings.json</c>, in ordinal order.</param>
public sealed record V9Description(ValueList<string> UiFolders);

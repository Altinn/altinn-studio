namespace Altinn.Studio.Designer.Models;

/// <summary>
/// A published app and the tag of the image it runs.
/// </summary>
/// <param name="App">The app's name.</param>
/// <param name="ImageTag">The tag of the image the app runs, or null when it is not known.</param>
public sealed record AppImage(string App, string? ImageTag);

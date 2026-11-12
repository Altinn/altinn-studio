namespace Altinn.Studio.Common.App.V8;

/// <summary>What only apps up to and including v8 have.</summary>
/// <param name="FrontendVersion">
/// The app frontend version that <see cref="AppFrontendVersionReader.IndexPath"/> loads, or <c>null</c> when it names
/// none. From v9 the backend serves the frontend itself, unless the app has kept the page.
/// </param>
public sealed record V8Description(AppFrontendVersion? FrontendVersion);

namespace Altinn.Studio.Common.App;

/// <summary>A version of an app that runs in an environment.</summary>
/// <param name="App">The app.</param>
/// <param name="Environment">The environment the app runs in.</param>
/// <param name="Version">The version that runs, which is the tag of the release it was deployed from.</param>
public sealed record AppDeployment(AppIdentifier App, RuntimeEnvironment Environment, AppVersion Version);

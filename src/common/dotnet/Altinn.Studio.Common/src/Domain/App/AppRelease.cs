using System;

namespace Altinn.Studio.Common.Domain.App;

/// <summary>A release of an app: a version built from a commit in the app's repository.</summary>
/// <param name="App">The app.</param>
/// <param name="Version">The release's tag, which deployments refer to as their version.</param>
/// <param name="Commit">The full SHA-1 of the commit the release was built from.</param>
/// <param name="Created">When the release was created.</param>
public sealed record AppRelease(AppIdentifier App, AppVersion Version, CommitSha Commit, DateTimeOffset Created);

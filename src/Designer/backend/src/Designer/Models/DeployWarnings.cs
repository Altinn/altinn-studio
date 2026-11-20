using System.Collections.Generic;
using System.Runtime.Serialization;
using NuGet.Versioning;

namespace Altinn.Studio.Designer.Models;

/// <summary>
/// What a user should know before deploying a release to an environment, from the version of the app libraries the
/// release uses and the version that runs in the environment.
/// </summary>
public sealed class DeployWarnings
{
    // From this major on, the app runs its process through the workflow engine, so a deploy across it changes how
    // the instances in the environment move on.
    private const int FirstWorkflowEngineMajor = 9;

    /// <summary>
    /// The warnings, in the order the user should read them. Empty when nothing is known to be at risk.
    /// </summary>
    public required IReadOnlyList<DeployWarning> Warnings { get; init; }

    /// <summary>
    /// The version of the app libraries the release uses, such as <c>9.0.0-preview.10</c>, or null when it could not
    /// be read from the release's project file.
    /// </summary>
    public string? ReleaseAppLibVersion { get; init; }

    /// <summary>
    /// The version of the app libraries the app in the environment reports, such as <c>8.7.2</c>, or null when the
    /// app did not answer or does not run there.
    /// </summary>
    public string? EnvironmentAppLibVersion { get; init; }

    /// <summary>
    /// Compares the two versions. A version that is not known gives no warning that depends on it, since a wrong
    /// warning teaches users to ignore the right ones.
    /// </summary>
    /// <param name="releaseVersion">The version of the app libraries the release uses, if known.</param>
    /// <param name="environmentVersion">The version of the app libraries that runs in the environment, if known.</param>
    /// <param name="toProduction">Whether the environment is a production environment.</param>
    public static DeployWarnings For(
        SemanticVersion? releaseVersion,
        SemanticVersion? environmentVersion,
        bool toProduction
    )
    {
        List<DeployWarning> warnings = [];
        if (releaseVersion is not null && environmentVersion is not null)
        {
            bool releaseUsesEngine = releaseVersion.Major >= FirstWorkflowEngineMajor;
            bool environmentUsesEngine = environmentVersion.Major >= FirstWorkflowEngineMajor;
            if (releaseUsesEngine && !environmentUsesEngine)
            {
                warnings.Add(DeployWarning.UpgradeToV9);
            }
            else if (!releaseUsesEngine && environmentUsesEngine)
            {
                warnings.Add(DeployWarning.RollbackFromV9);
            }
        }

        if (releaseVersion is { IsPrerelease: true } && toProduction)
        {
            warnings.Add(DeployWarning.PrereleaseToProduction);
        }

        return new DeployWarnings
        {
            Warnings = warnings,
            ReleaseAppLibVersion = releaseVersion?.ToNormalizedString(),
            // The app reports a file version with a fourth part, which says nothing to the user.
            EnvironmentAppLibVersion = environmentVersion is null
                ? null
                : $"{environmentVersion.Major}.{environmentVersion.Minor}.{environmentVersion.Patch}",
        };
    }
}

/// <summary>
/// A risk of deploying a release to an environment. The frontend turns each into text.
/// </summary>
public enum DeployWarning
{
    /// <summary>
    /// The release uses v9 or later of the app libraries, and the environment runs an older major. The new version
    /// takes over the instances the old one started, and some of them can get stuck.
    /// </summary>
    [EnumMember(Value = "upgradeToV9")]
    UpgradeToV9,

    /// <summary>
    /// The release uses an older major than v9 of the app libraries, and the environment runs v9 or later. An
    /// instance with a workflow pending cannot continue on the older version.
    /// </summary>
    [EnumMember(Value = "rollbackFromV9")]
    RollbackFromV9,

    /// <summary>
    /// The release uses a prerelease of the app libraries, and the environment is a production environment.
    /// </summary>
    [EnumMember(Value = "prereleaseToProduction")]
    PrereleaseToProduction,
}

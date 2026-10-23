using System;
using Altinn.Studio.Designer.Enums;

namespace Altinn.Studio.Designer.Helpers;

/// <summary>
/// The names of the repositories an owner shares across its apps: {owner}-datamodels, {owner}-content and
/// {owner}-resources. Every other repository is an app. An app's name may end in the same suffixes, so only the
/// full name decides.
/// </summary>
public static class RepositoryNames
{
    public static string DataModels(string owner) => $"{owner}-datamodels";

    public static string Content(string owner) => $"{owner}-content";

    public static string Resources(string owner) => $"{owner}-resources";

    /// <summary>
    /// Decides what a repository holds from its owner and name. Gitea compares names without regard to case.
    /// </summary>
    public static RepositoryKind KindOf(string owner, string repository)
    {
        if (repository.Equals(DataModels(owner), StringComparison.OrdinalIgnoreCase))
        {
            return RepositoryKind.DataModels;
        }

        if (repository.Equals(Content(owner), StringComparison.OrdinalIgnoreCase))
        {
            return RepositoryKind.Content;
        }

        if (repository.Equals(Resources(owner), StringComparison.OrdinalIgnoreCase))
        {
            return RepositoryKind.Resources;
        }

        return RepositoryKind.App;
    }
}

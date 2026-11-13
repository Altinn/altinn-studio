using System.Collections.Generic;

namespace Altinn.Studio.Designer.TypedHttpClients.Operator.Models;

/// <summary>
/// An app and the commit of its repository that the archive holds: what a run of a kind that runs app code, such as
/// <c>upgrade-v9</c>, is for. <see cref="Labels"/> are the labels of such a run, and Designer finds the run again by
/// them with <see cref="IOperatorClient.FindRuns"/>.
/// </summary>
/// <remarks>
/// The owner of the repository is not always the app's organization, such as for a copy of an app in a user's own
/// repositories. The operator compares label values without case, and a run returns them in lowercase.
/// </remarks>
/// <param name="Org">The organization that owns the app, as in the app's id <c>org/app</c>.</param>
/// <param name="App">The app's name, as in the app's id <c>org/app</c>.</param>
/// <param name="RepoOwner">The owner of the repository in Gitea.</param>
/// <param name="Repo">The name of the repository in Gitea.</param>
/// <param name="Commit">
/// The full id of the commit that the archive holds, in lowercase hexadecimal. The operator does not check the archive
/// against it.
/// </param>
internal sealed record RunSource(string Org, string App, string RepoOwner, string Repo, string Commit)
{
    /// <summary>
    /// The labels of a run for this app and commit, as the kinds that run app code list them in
    /// <see cref="Kind.Labels"/>.
    /// </summary>
    public IReadOnlyDictionary<string, string> Labels =>
        new Dictionary<string, string>
        {
            ["org"] = Org,
            ["app"] = App,
            ["repoOwner"] = RepoOwner,
            ["repo"] = Repo,
            ["commit"] = Commit,
        };
}

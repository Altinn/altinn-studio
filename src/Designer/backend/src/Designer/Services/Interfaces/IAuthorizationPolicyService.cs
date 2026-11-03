#nullable disable
using System.Threading;
using System.Threading.Tasks;

namespace Altinn.Studio.Designer.Services.Interfaces;

/// <summary>
/// IAuthorizationPolicyService
/// </summary>
public interface IAuthorizationPolicyService
{
    /// <summary>
    /// Updates the Authorization policy for an app
    /// </summary>
    /// <param name="org">Organization</param>
    /// <param name="app">Application</param>
    /// <param name="policyFileContent">The policy file, with its placeholder tokens</param>
    /// <param name="envName">Environment name</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    /// <returns></returns>
    Task UpdateApplicationAuthorizationPolicyAsync(
        string org,
        string app,
        string policyFileContent,
        string envName,
        CancellationToken cancellationToken = default
    );

    public Task<string> GetAuthorizationPolicyFileFromGitea(string org, string app, string shortCommitId);

    public string ReplacePolicyPlaceholderTokens(string policyFileContent, string org, string app);
}

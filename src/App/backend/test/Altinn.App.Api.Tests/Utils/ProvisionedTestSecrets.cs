using Altinn.App.Core.Internal.ProvisionedSecrets;

namespace Altinn.App.Api.Tests.Utils;

/// <summary>
/// The secrets directory the test host is given, provisioned the way the platform provisions a deployed app's:
/// a directory of files, never a configuration section. The test host binds against this directory instead of
/// the cluster mount, which is the only lever there is - an app, and therefore a test host, has no way to
/// supply a provisioned secret through its own configuration.
/// </summary>
internal static class ProvisionedTestSecrets
{
    /// <summary>
    /// A <c>WorkflowEngineCallback</c> app-code, so the enqueue path can mint callback tokens and the always-on
    /// <c>WorkflowEngineCallback</c> startup validation passes for every test host.
    /// </summary>
    private const string AppCodesJson = """
        {
          "AppCodes": {
            "WorkflowEngineCallback": [
              {
                "Id": "test",
                "Code": "test-workflow-engine-callback-secret-long-enough",
                "IssuedAt": "2020-01-01T00:00:00Z",
                "ExpiresAt": "2999-01-01T00:00:00Z"
              }
            ]
          }
        }
        """;

    private static readonly Lazy<string> _directory = new(Provision, LazyThreadSafetyMode.ExecutionAndPublication);

    /// <summary>
    /// The provisioned directory, created once per test process.
    /// </summary>
    public static string Directory => _directory.Value;

    /// <summary>
    /// The channel a host reads the provisioned files through. Registered before <c>AddAltinnAppServices</c> so
    /// that it wins the <c>TryAdd</c> the real registration does.
    /// </summary>
    public static ProvisionedSecrets CreateChannel() => new(Directory, ProvisionedSecretFiles.All);

    private static string Provision()
    {
        string directory = System.IO.Directory.CreateTempSubdirectory("altinn-app-api-tests-secrets").FullName;
        File.WriteAllText(Path.Join(directory, ProvisionedSecretFiles.AppCodes.FileName), AppCodesJson);
        return directory;
    }
}

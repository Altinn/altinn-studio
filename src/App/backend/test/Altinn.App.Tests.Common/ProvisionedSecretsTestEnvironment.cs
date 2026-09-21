using System.Buffers.Text;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Nodes;
using Altinn.App.Core.Internal.ProvisionedSecrets;

namespace Altinn.App.Tests.Common;

/// <summary>
/// <para>The platform's side of the provisioned secrets contract, for a test host that has to start. A
/// deployed app is told where its secrets are and what each file is called, and the platform provisions both
/// files the libraries host — the app's one Maskinporten client and its callback verification codes — so a
/// host given neither does not resemble anything that runs.</para>
/// <para>This writes throwaway versions of both into a temporary directory, in the shape the operator writes
/// them, and hands back the variables that point an app at it.</para>
/// </summary>
public static class ProvisionedSecretsTestEnvironment
{
    /// <summary>
    /// The configuration key naming the directory the platform provisions the app's secrets into.
    /// </summary>
    public const string DirectoryKey = "RUNTIME_APP_SECRETS_DIR";

    /// <summary>
    /// What a test calls the Maskinporten file. Any name would do — that is the point of the variable — and
    /// this is the one the platform uses, so a file left behind by a test is recognizable.
    /// </summary>
    public const string MaskinportenFileName = "maskinporten-settings.json";

    /// <summary>
    /// What a test calls the app codes file, on the same terms.
    /// </summary>
    public const string AppCodesFileName = "app-codes.json";

    /// <summary>
    /// A <c>WorkflowEngineCallback</c> code, so that the enqueue path can mint callback tokens and the
    /// always-on startup validation of that code passes for every test host.
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

    private static readonly Lazy<string> _provisionedDirectory = new(
        CreateProvisionedDirectory,
        LazyThreadSafetyMode.ExecutionAndPublication
    );

    private static readonly Lazy<string> _emptyDirectory = new(
        () => Directory.CreateTempSubdirectory("altinn-app-provisioned-secrets-empty-").FullName,
        LazyThreadSafetyMode.ExecutionAndPublication
    );

    /// <summary>
    /// A directory holding a usable Maskinporten client and a usable app code, created once per test process.
    /// </summary>
    public static string SecretsDirectory => _provisionedDirectory.Value;

    /// <summary>
    /// The variables a deployed app receives, pointing at <see cref="SecretsDirectory"/>. Use these where the
    /// host has to start.
    /// </summary>
    public static IReadOnlyList<KeyValuePair<string, string?>> Variables => VariablesFor(SecretsDirectory);

    /// <summary>
    /// The same variables, pointing at a directory the platform provisioned nothing into. Use these where a
    /// container is built but never started, and the test supplies the settings it wants some other way: the
    /// app libraries still need to be told where to look, and find nothing when they do. A test that does
    /// start its host needs <see cref="Variables"/> instead.
    /// </summary>
    public static IReadOnlyList<KeyValuePair<string, string?>> VariablesWithNothingProvisioned =>
        VariablesFor(_emptyDirectory.Value);

    /// <summary>
    /// The variables a deployed app receives, pointing at <paramref name="secretsDirectory"/>.
    /// </summary>
    /// <param name="secretsDirectory">The directory standing in for the platform's secrets mount.</param>
    public static IReadOnlyList<KeyValuePair<string, string?>> VariablesFor(string secretsDirectory) =>
        [
            new(DirectoryKey, secretsDirectory),
            new(ProvisionedSecretFiles.Maskinporten.FileNameKey, MaskinportenFileName),
            new(ProvisionedSecretFiles.AppCodes.FileNameKey, AppCodesFileName),
        ];

    /// <summary>
    /// Writes a usable Maskinporten client into <paramref name="secretsDirectory"/>.
    /// </summary>
    /// <param name="secretsDirectory">The directory standing in for the platform's secrets mount.</param>
    /// <param name="clientId">The client id the app should read.</param>
    public static void WriteMaskinportenClient(string secretsDirectory, string clientId = "test-client") =>
        File.WriteAllText(Path.Join(secretsDirectory, MaskinportenFileName), CreateMaskinportenSettingsJson(clientId));

    /// <summary>
    /// Writes a usable set of app codes into <paramref name="secretsDirectory"/>.
    /// </summary>
    /// <param name="secretsDirectory">The directory standing in for the platform's secrets mount.</param>
    public static void WriteAppCodes(string secretsDirectory) =>
        File.WriteAllText(Path.Join(secretsDirectory, AppCodesFileName), AppCodesJson);

    /// <summary>
    /// The contents of the Maskinporten file, in the shape the operator writes: the credentials wrapped in a
    /// <c>MaskinportenSettings</c> object, with a complete RSA private key as a JWK.
    /// </summary>
    /// <param name="clientId">The client id the app should read.</param>
    /// <param name="authority">The Maskinporten authority the app should read.</param>
    public static string CreateMaskinportenSettingsJson(
        string clientId = "test-client",
        string authority = "https://test.maskinporten.no/"
    )
    {
        var settings = new JsonObject
        {
            ["MaskinportenSettings"] = new JsonObject
            {
                ["Authority"] = authority,
                ["ClientId"] = clientId,
                ["Jwk"] = CreateJwk(),
            },
        };

        return settings.ToJsonString(new JsonSerializerOptions { WriteIndented = true });
    }

    /// <summary>
    /// A freshly generated RSA private key as a JWK. Every component the app libraries require is present:
    /// an incomplete key is rejected the moment a token is minted, which is too late for a test host.
    /// </summary>
    private static JsonObject CreateJwk()
    {
        using RSA rsa = RSA.Create(2048);
        RSAParameters parameters = rsa.ExportParameters(includePrivateParameters: true);

        return new JsonObject
        {
            ["kty"] = "RSA",
            ["use"] = "sig",
            ["kid"] = Guid.NewGuid().ToString("N"),
            ["alg"] = "RS256",
            ["n"] = Encode(parameters.Modulus),
            ["e"] = Encode(parameters.Exponent),
            ["d"] = Encode(parameters.D),
            ["p"] = Encode(parameters.P),
            ["q"] = Encode(parameters.Q),
            ["dp"] = Encode(parameters.DP),
            ["dq"] = Encode(parameters.DQ),
            ["qi"] = Encode(parameters.InverseQ),
        };
    }

    private static string Encode(byte[]? component) =>
        component is null ? string.Empty : Base64Url.EncodeToString(component);

    private static string CreateProvisionedDirectory()
    {
        string secretsDirectory = Directory.CreateTempSubdirectory("altinn-app-provisioned-secrets-").FullName;
        WriteMaskinportenClient(secretsDirectory);
        WriteAppCodes(secretsDirectory);

        return secretsDirectory;
    }
}

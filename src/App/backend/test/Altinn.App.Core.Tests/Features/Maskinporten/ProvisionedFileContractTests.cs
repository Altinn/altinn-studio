using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features.Maskinporten.Extensions;
using Altinn.App.Core.Features.Maskinporten.Models;
using Altinn.App.Core.Internal;
using Altinn.App.Core.Internal.ProvisionedSecrets;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace Altinn.App.Core.Tests.Features.Maskinporten;

/// <summary>
/// <para>The provisioned Maskinporten file is a contract between three parties in three places: the operator
/// writes it into the app's Secret, studioctl writes it for a local run, and the app libraries read it. The
/// shared examples in <c>src/common/provisioned-secrets-contract</c> are what each party is tested against: the
/// operator's and studioctl's tests check that each writes its examples, and this test checks that the app
/// libraries read every one of them.</para>
/// </summary>
public sealed class ProvisionedFileContractTests
{
    private const string PlatformHostName = "at22.altinn.cloud";

    private static readonly string _contractDirectory = Path.Join(
        AppContext.BaseDirectory,
        "ProvisionedSecretsContract"
    );

    private static readonly Contract _contract = ReadContract();

    public static TheoryData<string> Examples => new(_contract.Maskinporten.Examples.Select(example => example.File));

    [Fact]
    public void TheLibrariesReadTheContractsNames()
    {
        Assert.Equal(ProvisionedSecrets.DirectoryKey, _contract.DirectoryVariable);
        Assert.Equal(ProvisionedSecretFiles.Maskinporten.FileNameKey, _contract.Maskinporten.FileNameVariable);
        Assert.Equal(ProvisionedSecretFiles.Maskinporten.SectionName, _contract.Maskinporten.Section);
    }

    [Fact]
    public void EveryWriterHasAnExample()
    {
        Assert.Contains(_contract.Maskinporten.Examples, example => example.Writer == "operator");
        Assert.Contains(_contract.Maskinporten.Examples, example => example.Writer == "studioctl");
    }

    [Theory]
    [MemberData(nameof(Examples))]
    public async Task TheLibrariesReadTheExample(string file)
    {
        Example example = _contract.Maskinporten.Examples.Single(candidate => candidate.File == file);
        string secretsDirectory = Directory.CreateTempSubdirectory("altinn-app-provisioned-contract-").FullName;
        try
        {
            File.Copy(
                Path.Join(_contractDirectory, example.File),
                Path.Join(secretsDirectory, _contract.Maskinporten.FileName)
            );
            await using var serviceProvider = BuildAppProvider(secretsDirectory);

            Assert.True(
                serviceProvider
                    .GetRequiredService<ProvisionedSecrets>()
                    .IsProvisioned(ProvisionedSecretFiles.Maskinporten)
            );
            // Reading the options runs the same validation that stops a deployed app without a usable client.
            MaskinportenSettings settings = serviceProvider.GetRequiredService<IOptions<MaskinportenSettings>>().Value;
            Assert.Equal(example.Authority, settings.Authority);
            Assert.Equal(example.ClientId, settings.ClientId);

            JsonWebKey key = settings.GetJsonWebKey();
            Assert.Equal(example.KeyId, key.Kid);
            Assert.True(key.HasPrivateKey);
            await AssertCanSignAGrant(key);
        }
        finally
        {
            Directory.Delete(secretsDirectory, recursive: true);
        }
    }

    /// <summary>
    /// Signs a token the way the Maskinporten client signs its grant, and verifies the signature.
    /// </summary>
    private static async Task AssertCanSignAGrant(JsonWebKey key)
    {
        var handler = new JsonWebTokenHandler();
        string token = handler.CreateToken(
            new SecurityTokenDescriptor
            {
                Issuer = "contract-test",
                Audience = "contract-test",
                SigningCredentials = new SigningCredentials(key, SecurityAlgorithms.RsaSha256),
            }
        );

        TokenValidationResult result = await handler.ValidateTokenAsync(
            token,
            new TokenValidationParameters
            {
                ValidIssuer = "contract-test",
                ValidAudience = "contract-test",
                IssuerSigningKey = key,
            }
        );
        Assert.True(result.IsValid, result.Exception?.Message);
    }

    private static ServiceProvider BuildAppProvider(string secretsDirectory)
    {
        var services = new ServiceCollection();
        services.AddSingleton<IConfiguration>(
            new ConfigurationBuilder()
                .AddInMemoryCollection([
                    new(_contract.DirectoryVariable, secretsDirectory),
                    new(_contract.Maskinporten.FileNameVariable, _contract.Maskinporten.FileName),
                    new(ProvisionedSecretFiles.AppCodes.FileNameKey, "app-codes.json"),
                ])
                .Build()
        );
        services.AddRuntimeEnvironment();
        services.AddLogging();
        services.Configure<GeneralSettings>(options => options.HostName = PlatformHostName);
        services.Configure<PlatformSettings>(_ => { });
        services.AddMaskinportenSettings();

        return services.BuildStrictServiceProvider();
    }

    private static Contract ReadContract()
    {
        string json = File.ReadAllText(Path.Join(_contractDirectory, "contract.json"));
        return JsonSerializer.Deserialize<Contract>(json)
            ?? throw new InvalidOperationException("The provisioned secrets contract is empty.");
    }

    private sealed record Contract(
        [property: JsonPropertyName("directoryVariable")] string DirectoryVariable,
        [property: JsonPropertyName("maskinporten")] MaskinportenContract Maskinporten
    );

    private sealed record MaskinportenContract(
        [property: JsonPropertyName("fileNameVariable")] string FileNameVariable,
        [property: JsonPropertyName("fileName")] string FileName,
        [property: JsonPropertyName("section")] string Section,
        [property: JsonPropertyName("examples")] IReadOnlyList<Example> Examples
    );

    private sealed record Example(
        [property: JsonPropertyName("file")] string File,
        [property: JsonPropertyName("writer")] string Writer,
        [property: JsonPropertyName("authority")] string Authority,
        [property: JsonPropertyName("clientId")] string ClientId,
        [property: JsonPropertyName("keyId")] string KeyId
    );
}

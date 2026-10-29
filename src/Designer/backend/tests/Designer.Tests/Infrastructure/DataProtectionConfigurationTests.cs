#nullable enable
using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Cryptography;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Infrastructure;
using Azure.Core.Cryptography;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.DataProtection.KeyManagement;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace Designer.Tests.Infrastructure;

public sealed class DataProtectionConfigurationTests : IDisposable
{
    private const string KeyIdentifier = "https://test.vault.azure.net/keys/data-protection";
    private readonly string _keysDirectory = Directory.CreateTempSubdirectory().FullName;

    [Theory]
    [InlineData("Staging")]
    [InlineData("Production")]
    public void ConfigureDataProtection_DeployedWithoutSecretUri_Throws(string environmentName)
    {
        ServiceCollection services = new();

        Assert.Throws<InvalidOperationException>(() =>
            services.ConfigureDataProtection(
                BuildConfiguration(secretUri: null),
                BuildEnvironment(environmentName),
                NullLogger.Instance
            )
        );
    }

    [Fact]
    public void ConfigureDataProtection_DevelopmentWithoutSecretUri_KeepsKeysUnencrypted()
    {
        ServiceCollection services = new();

        services.ConfigureDataProtection(
            BuildConfiguration(secretUri: null),
            BuildEnvironment(Environments.Development),
            NullLogger.Instance
        );

        Assert.Null(GetKeyManagementOptions(services).XmlEncryptor);
    }

    [Fact]
    public void ConfigureDataProtection_WithSecretUri_EncryptsKeysWithKeyVault()
    {
        ServiceCollection services = new();

        services.ConfigureDataProtection(
            BuildConfiguration(secretUri: "https://test.vault.azure.net/"),
            BuildEnvironment(Environments.Production),
            NullLogger.Instance
        );

        Assert.Equal("AzureKeyVaultXmlEncryptor", GetKeyManagementOptions(services).XmlEncryptor?.GetType().Name);
    }

    // Designer's key ring was written by Microsoft.AspNetCore.DataProtection.AzureKeyVault before it moved to
    // Azure.Extensions.AspNetCore.DataProtection.Keys. The two write the same XML and differ only in the decryptor
    // type that each key names, so if the new package stops reading that type every user is signed out.
    [Fact]
    public void ProtectKeysWithAzureKeyVault_KeyRingFromLegacyPackage_Unprotects()
    {
        LocalKeyEncryptionKeyResolver keyResolver = new();
        string protectedPayload = CreateDataProtector(keyResolver).Protect("payload");
        RewriteDecryptorTypesToLegacyPackage();

        string payload = CreateDataProtector(keyResolver).Unprotect(protectedPayload);

        Assert.Equal("payload", payload);
    }

    public void Dispose()
    {
        Directory.Delete(_keysDirectory, recursive: true);
    }

    private static IConfiguration BuildConfiguration(string? secretUri) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["kvSetting:SecretUri"] = secretUri })
            .Build();

    private static IHostEnvironment BuildEnvironment(string environmentName)
    {
        Mock<IHostEnvironment> environment = new();
        environment.Setup(e => e.EnvironmentName).Returns(environmentName);
        return environment.Object;
    }

    private static KeyManagementOptions GetKeyManagementOptions(ServiceCollection services) =>
        services.BuildServiceProvider().GetRequiredService<IOptions<KeyManagementOptions>>().Value;

    private IDataProtector CreateDataProtector(IKeyEncryptionKeyResolver keyResolver)
    {
        ServiceCollection services = new();
        services
            .AddDataProtection()
            .PersistKeysToFileSystem(new DirectoryInfo(_keysDirectory))
            .ProtectKeysWithAzureKeyVault(new Uri(KeyIdentifier), keyResolver);
        return services.BuildServiceProvider().GetDataProtector("test");
    }

    private void RewriteDecryptorTypesToLegacyPackage()
    {
        string[] keyFiles = Directory.GetFiles(_keysDirectory, "key-*.xml");
        Assert.NotEmpty(keyFiles);
        foreach (string keyFile in keyFiles)
        {
            string xml = File.ReadAllText(keyFile);
            string legacyXml = Regex.Replace(
                xml,
                "decryptorType=\"Azure\\.Extensions\\.AspNetCore\\.DataProtection\\.Keys\\.AzureKeyVaultXmlDecryptor, [^\"]+\"",
                "decryptorType=\"Microsoft.AspNetCore.DataProtection.AzureKeyVault.AzureKeyVaultXmlDecryptor, "
                    + "Microsoft.AspNetCore.DataProtection.AzureKeyVault, Version=3.1.24.0, Culture=neutral, "
                    + "PublicKeyToken=adb9793829ddae60\""
            );
            Assert.NotEqual(xml, legacyXml);
            File.WriteAllText(keyFile, legacyXml);
        }
    }

    private sealed class LocalKeyEncryptionKeyResolver : IKeyEncryptionKeyResolver
    {
        private readonly LocalKeyEncryptionKey _key = new();

        public IKeyEncryptionKey Resolve(string keyId, CancellationToken cancellationToken = default) => _key;

        public Task<IKeyEncryptionKey> ResolveAsync(string keyId, CancellationToken cancellationToken = default) =>
            Task.FromResult<IKeyEncryptionKey>(_key);
    }

    private sealed class LocalKeyEncryptionKey : IKeyEncryptionKey
    {
        private readonly RSA _rsa = RSA.Create(2048);

        public string KeyId => KeyIdentifier;

        public byte[] WrapKey(
            string algorithm,
            ReadOnlyMemory<byte> key,
            CancellationToken cancellationToken = default
        ) => _rsa.Encrypt(key.Span, RSAEncryptionPadding.OaepSHA1);

        public Task<byte[]> WrapKeyAsync(
            string algorithm,
            ReadOnlyMemory<byte> key,
            CancellationToken cancellationToken = default
        ) => Task.FromResult(WrapKey(algorithm, key, cancellationToken));

        public byte[] UnwrapKey(
            string algorithm,
            ReadOnlyMemory<byte> encryptedKey,
            CancellationToken cancellationToken = default
        ) => _rsa.Decrypt(encryptedKey.Span, RSAEncryptionPadding.OaepSHA1);

        public Task<byte[]> UnwrapKeyAsync(
            string algorithm,
            ReadOnlyMemory<byte> encryptedKey,
            CancellationToken cancellationToken = default
        ) => Task.FromResult(UnwrapKey(algorithm, encryptedKey, cancellationToken));
    }
}

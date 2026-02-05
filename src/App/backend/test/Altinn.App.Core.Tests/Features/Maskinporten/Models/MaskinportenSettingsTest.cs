using System.Text;
using System.Text.Json;
using Altinn.App.Core.Features.Maskinporten.Exceptions;
using Altinn.App.Core.Features.Maskinporten.Extensions;
using Altinn.App.Core.Features.Maskinporten.Models;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Altinn.App.Core.Tests.Features.Maskinporten.Models;

public class MaskinportenSettingsTest
{
    /// <summary>
    /// This key definition is complete and valid
    /// </summary>
    private static readonly string _validJwk = """
        {
            "p": "5BRHaF0zpryULcbyTf02xZUXMb26Ait8XvU4NsAYCH4iLNkC_zYRJ0X_qb0sJ_WVYecB1-nCV1Qr15KnsaKp1qBOx21_ftHHwdBE12z9KYGe1xQ4ZIXEP0OiR044XQPphRFVjWOF7wQKdoXlTNXCg4B3lo5waBj8eYmMHCxyK6k",
            "kty": "RSA",
            "q": "yR6wLPzQ35bc0ZIxuzuil9sRpMZhqk2tWe6cV1YkqxSXPDLOjHBPbwdeNdd2qdSY_x0myzIF_KA0xD-Q5YXCMt-8UxJTYKf8TLIxTdRKyW7KQbR0HJ4yNx0DuoXEeeDfLXbMX_TbL_W6N4xHPHiuGvh1Spr4s4JC0Ka1PLK8b2E",
            "d": "jR4l-ZW3_eAqTRxmmkYNTGxp8fURn8C9mar5-NatcyR5HfqpofjQIVtGLNfhS-YMkeam8pIXjsdrWrSTIC22uUf4OuNDRWsKEwePYoNO1xNusF-8fOMM7At6qtPpcXk3pEHfEuSjplIOAL9scj2oeF3jqe5eP9l4KHDYLugqkxJz3AoObTBQDykXx3uq_3cjeSBss1XFdEnpD2Br1zR7-sGaEoSIQyT6a8Ulgr1Ah5AHm6KX4LTgPx3NuWLyDqN-L6QxYnv27BC6J-4ehwpf84CO-uolJKcVPvEwBf35LFlBA3JgKaVYyC7SZ5A2y_EBViKhubgOuMm9_2C7o9PyAQ",
            "e": "AQAB",
            "use": "sig",
            "kid": "test-kid",
            "qi": "E-oyO4HWOVxD_d7xZxFltTZDz6ZtLPZFB_KYXYeVFDrO8KZE9kFb4TNlFvrFjv-dHtpNey95gqtOtdNMwdVdZbAKbDdo5LYSJ_rk-4ZVsDusq7FCJ5nmmrxfQ5yNEPqHwgdUfs50v_fV1x8SEDjfWzaaVK5ltqPiUXtpTTLBQIg",
            "dp": "yVvJ6y6VgjfszjldBFNv_qHwlz58MJw5sg_mcBfJX_4Tp-pzReNy42xeGXnkuOaM2qE6tGcw5y5tgmV8XUxRiyV-R3y5WbpVFBwOGu6i1vkTxaiZXM3oAz5vz2oUQrJIgO1bzXa28NxtbFQrq1jw4G4Tpjzcqlqc06QGqXzn0vk",
            "alg": "RS256",
            "dq": "B5CI7dhAfvhsq9FE35b5oZ6SxlDT4ZT0XTqVVM-fp3Op0JDUpgGfazyqtXm6M98UNhxBlkj2Yq8f7PW7HHbwe_tgWPuKeUs4OSZGpnfCrFrnbps79suYdew4dK6NWkwz-MDMJRvPlrk2XNqA32xmmAsaVkkH67CNlM2AaZ0La2E",
            "n": "sy9DZ1U6jfP1UBN2EZTD1DPkajdZsFsXGGVHfbJmH5MFwXbtKlwV_jYjz58YIj1n48OxH7f-Ldgc-fBLz45QU1HbDZPij7q3uYm1ZMTGkPqkY8kHX51TsFOEqzVhNfyc6yVsjlj5KPyyxLyAcx6ixiE2K8vIeuKMVbZCZt605L39ENUsiQ-cfnqp-zo1ihU5xJOQaWV9pGuG4XoLAUIktF6_YPF4pFmSWRHk5aURUfTCvo11n3EUBYJUiJb8AqUt3yqGSoV-4wXir-9oRNjDUtE_QA3eErGKCebtUd6oxzcXcHiGY0npKxt7JQti3jTZRcnkScmmP-XvrQzB6kzSCQ"
        }
        """;

    /// <summary>
    /// This is a Base64 encoded version of <see cref="_validJwk"/>.
    /// <inheritdoc cref="_validJwk"/>
    /// </summary>
    private static string _validJwkBase64 => Convert.ToBase64String(Encoding.UTF8.GetBytes(_validJwk));

    /// <summary>
    /// This key definition is missing the `e` exponent and the `kid` identifier
    /// </summary>
    private static readonly string _invalidJwk = """
        {
            "p": "5BRHaF0zpryULcbyTf02xZUXMb26Ait8XvU4NsAYCH4iLNkC_zYRJ0X_qb0sJ_WVYecB1-nCV1Qr15KnsaKp1qBOx21_ftHHwdBE12z9KYGe1xQ4ZIXEP0OiR044XQPphRFVjWOF7wQKdoXlTNXCg4B3lo5waBj8eYmMHCxyK6k",
            "kty": "RSA",
            "q": "yR6wLPzQ35bc0ZIxuzuil9sRpMZhqk2tWe6cV1YkqxSXPDLOjHBPbwdeNdd2qdSY_x0myzIF_KA0xD-Q5YXCMt-8UxJTYKf8TLIxTdRKyW7KQbR0HJ4yNx0DuoXEeeDfLXbMX_TbL_W6N4xHPHiuGvh1Spr4s4JC0Ka1PLK8b2E",
            "d": "jR4l-ZW3_eAqTRxmmkYNTGxp8fURn8C9mar5-NatcyR5HfqpofjQIVtGLNfhS-YMkeam8pIXjsdrWrSTIC22uUf4OuNDRWsKEwePYoNO1xNusF-8fOMM7At6qtPpcXk3pEHfEuSjplIOAL9scj2oeF3jqe5eP9l4KHDYLugqkxJz3AoObTBQDykXx3uq_3cjeSBss1XFdEnpD2Br1zR7-sGaEoSIQyT6a8Ulgr1Ah5AHm6KX4LTgPx3NuWLyDqN-L6QxYnv27BC6J-4ehwpf84CO-uolJKcVPvEwBf35LFlBA3JgKaVYyC7SZ5A2y_EBViKhubgOuMm9_2C7o9PyAQ",
            "e": "",
            "use": "sig",
            "kid": "",
            "qi": "E-oyO4HWOVxD_d7xZxFltTZDz6ZtLPZFB_KYXYeVFDrO8KZE9kFb4TNlFvrFjv-dHtpNey95gqtOtdNMwdVdZbAKbDdo5LYSJ_rk-4ZVsDusq7FCJ5nmmrxfQ5yNEPqHwgdUfs50v_fV1x8SEDjfWzaaVK5ltqPiUXtpTTLBQIg",
            "dp": "yVvJ6y6VgjfszjldBFNv_qHwlz58MJw5sg_mcBfJX_4Tp-pzReNy42xeGXnkuOaM2qE6tGcw5y5tgmV8XUxRiyV-R3y5WbpVFBwOGu6i1vkTxaiZXM3oAz5vz2oUQrJIgO1bzXa28NxtbFQrq1jw4G4Tpjzcqlqc06QGqXzn0vk",
            "alg": "RS256",
            "dq": "B5CI7dhAfvhsq9FE35b5oZ6SxlDT4ZT0XTqVVM-fp3Op0JDUpgGfazyqtXm6M98UNhxBlkj2Yq8f7PW7HHbwe_tgWPuKeUs4OSZGpnfCrFrnbps79suYdew4dK6NWkwz-MDMJRvPlrk2XNqA32xmmAsaVkkH67CNlM2AaZ0La2E",
            "n": "sy9DZ1U6jfP1UBN2EZTD1DPkajdZsFsXGGVHfbJmH5MFwXbtKlwV_jYjz58YIj1n48OxH7f-Ldgc-fBLz45QU1HbDZPij7q3uYm1ZMTGkPqkY8kHX51TsFOEqzVhNfyc6yVsjlj5KPyyxLyAcx6ixiE2K8vIeuKMVbZCZt605L39ENUsiQ-cfnqp-zo1ihU5xJOQaWV9pGuG4XoLAUIktF6_YPF4pFmSWRHk5aURUfTCvo11n3EUBYJUiJb8AqUt3yqGSoV-4wXir-9oRNjDUtE_QA3eErGKCebtUd6oxzcXcHiGY0npKxt7JQti3jTZRcnkScmmP-XvrQzB6kzSCQ"
        }
        """;

    /// <summary>
    /// This is a Base64 encoded version of <see cref="_invalidJwk"/>.
    /// <inheritdoc cref="_invalidJwk"/>
    /// </summary>
    private static string _invalidJwkBase64 => Convert.ToBase64String(Encoding.UTF8.GetBytes(_invalidJwk));

    [Fact]
    public void ShouldDeserializeFromJsonCorrectly()
    {
        // Arrange
        var json = $$"""
            {
                "authority": "https://maskinporten.dev/",
                "clientId": "test-client",
                "jwk": {{_validJwk}}
            }
            """;

        // Act
        var settings = JsonSerializer.Deserialize<MaskinportenSettings>(json);

        // Assert
        Assert.NotNull(settings);
        settings.Authority.Should().Be("https://maskinporten.dev/");
        settings.GetJsonWebKey().KeyId.Should().Be("test-kid");
        settings.ClientId.Should().Be("test-client");
    }

    [Fact]
    public void ShouldDeserializeFromJsonCorrectly_Base64Encoded()
    {
        // Arrange
        var json = $$"""
            {
                "authority": "https://maskinporten.dev/",
                "clientId": "test-client",
                "jwkBase64": "{{_validJwkBase64}}"
            }
            """;

        // Act
        var settings = JsonSerializer.Deserialize<MaskinportenSettings>(json);

        // Assert
        Assert.NotNull(settings);
        settings.Authority.Should().Be("https://maskinporten.dev/");
        settings.ClientId.Should().Be("test-client");
        settings.GetJsonWebKey().KeyId.Should().Be("test-kid");
    }

    [Fact]
    public void ShouldValidateJwkAfterDeserializing()
    {
        // Arrange
        var json = $$"""
            {
                "authority": "https://maskinporten.dev/",
                "clientId": "test-client",
                "jwk": {{_invalidJwk}}
            }
            """;

        // Act
        var settings = JsonSerializer.Deserialize<MaskinportenSettings>(json);
        Func<JsonWebKey> act = () =>
        {
            Assert.NotNull(settings);
            return settings.GetJsonWebKey();
        };

        // Assert
        act.Should()
            .Throw<MaskinportenConfigurationException>()
            .WithMessage("The * is invalid after deserialization, not all required properties were found: *");
    }

    [Fact]
    public void ShouldValidateJwkAfterDeserializing_Base64()
    {
        // Arrange
        var json = $$"""
            {
                "authority": "https://maskinporten.dev/",
                "clientId": "test-client",
                "jwkBase64": "{{_invalidJwkBase64}}"
            }
            """;

        // Act
        var settings = JsonSerializer.Deserialize<MaskinportenSettings>(json);
        Func<JsonWebKey> act = () =>
        {
            Assert.NotNull(settings);
            return settings.GetJsonWebKey();
        };

        // Assert
        act.Should()
            .Throw<MaskinportenConfigurationException>()
            .WithMessage("The * is invalid after deserialization, not all required properties were found: *");
    }

    [Fact]
    public void ShouldThrowOnBadBas64String1()
    {
        // Arrange
        // `jwkBase64` is *not* base64 encoded
        var json = $$"""
            {
                "authority": "https://maskinporten.dev/",
                "clientId": "test-client",
                "jwkBase64": "this is not the right stuff"
            }
            """;

        // Act
        var settings = JsonSerializer.Deserialize<MaskinportenSettings>(json);
        Func<JsonWebKey> act = () =>
        {
            Assert.NotNull(settings);
            return settings.GetJsonWebKey();
        };

        // Assert
        act.Should()
            .Throw<MaskinportenConfigurationException>()
            .WithMessage("Error decoding MaskinportenSettings.JwkBase64 from base64: *");
    }

    [Fact]
    public void ShouldThrowOnBadBas64String2()
    {
        // Arrange
        // `jwkBase64` is base64 encoded, but contains invalid data
        var json = $$"""
            {
                "authority": "https://maskinporten.dev/",
                "clientId": "test-client",
                "jwkBase64": "dGhpcyBpcyBhbiBpbnZhbGlkIEp3a1dyYXBwZXIgb2JqZWN0"
            }
            """;

        // Act
        var settings = JsonSerializer.Deserialize<MaskinportenSettings>(json);
        Func<JsonWebKey> act = () =>
        {
            Assert.NotNull(settings);
            return settings.GetJsonWebKey();
        };

        // Assert
        act.Should()
            .Throw<MaskinportenConfigurationException>()
            .WithMessage("Error parsing MaskinportenSettings.JwkBase64 JSON structure: *");
    }

    [Fact]
    public void RequiresAtLeastOneJwk()
    {
        // Arrange
        // `jwk` and `jwkBase64` is missing
        var json = $$"""
            {
                "authority": "https://maskinporten.dev/",
                "clientId": "test-client"
            }
            """;

        // Act
        var settings = JsonSerializer.Deserialize<MaskinportenSettings>(json);
        Func<JsonWebKey> act = () =>
        {
            Assert.NotNull(settings);
            return settings.GetJsonWebKey();
        };

        // Assert
        act.Should().Throw<MaskinportenConfigurationException>().WithMessage("No private key configured*");
    }

    [Theory]
    [InlineData("https://maskinporten.dev/")]
    [InlineData("https://maskinporten.dev")]
    public async Task LoadFromJsonFile_WithJwkBase64_BindsCorrectly(string authority)
    {
        // Arrange
        var tempDir = Path.Join(Path.GetTempPath(), Guid.NewGuid().ToString());
        Directory.CreateDirectory(tempDir);

        try
        {
            var json = $$"""
                {
                    "MaskinportenSettings": {
                        "authority": "{{authority}}",
                        "clientId": "test-client-id",
                        "jwkBase64": "{{_validJwkBase64}}"
                    }
                }
                """;
            var filePath = Path.Join(tempDir, "maskinporten-settings.json");
            await File.WriteAllTextAsync(filePath, json);

            var configuration = new ConfigurationBuilder().AddJsonFile(filePath).Build();

            var services = new ServiceCollection();
            services.AddSingleton<IConfiguration>(configuration);
            services.ConfigureMaskinportenClient("MaskinportenSettings");

            await using var serviceProvider = services.BuildStrictServiceProvider();

            // Act
            var options = serviceProvider.GetRequiredService<IOptions<MaskinportenSettings>>();
            var settings = options.Value;

            // Assert
            Assert.Equal(authority, settings.Authority);
            Assert.Equal("test-client-id", settings.ClientId);
            Assert.NotNull(settings.GetJsonWebKey());
            Assert.Equal("test-kid", settings.GetJsonWebKey().KeyId);
        }
        finally
        {
            Directory.Delete(tempDir, recursive: true);
        }
    }

    [Theory]
    [InlineData("https://maskinporten.dev/")]
    [InlineData("https://maskinporten.dev")]
    public async Task LoadFromJsonFile_WithJwk_BindsCorrectly(string authority)
    {
        // Arrange
        var tempDir = Path.Join(Path.GetTempPath(), Guid.NewGuid().ToString());
        Directory.CreateDirectory(tempDir);

        try
        {
            var json = $$"""
                {
                    "MaskinportenSettings": {
                        "authority": "{{authority}}",
                        "clientId": "test-client-id",
                        "jwk": {{_validJwk}}
                    }
                }
                """;
            var filePath = Path.Join(tempDir, "maskinporten-settings.json");
            await File.WriteAllTextAsync(filePath, json);

            var configuration = new ConfigurationBuilder().AddJsonFile(filePath).Build();

            var services = new ServiceCollection();
            services.AddSingleton<IConfiguration>(configuration);
            services.ConfigureMaskinportenClient("MaskinportenSettings");

            await using var serviceProvider = services.BuildStrictServiceProvider();

            // Act
            var options = serviceProvider.GetRequiredService<IOptions<MaskinportenSettings>>();
            var settings = options.Value;

            // Assert
            Assert.Equal(authority, settings.Authority);
            Assert.Equal("test-client-id", settings.ClientId);
            Assert.NotNull(settings.GetJsonWebKey());
            Assert.Equal("test-kid", settings.GetJsonWebKey().KeyId);
        }
        finally
        {
            Directory.Delete(tempDir, recursive: true);
        }
    }
}

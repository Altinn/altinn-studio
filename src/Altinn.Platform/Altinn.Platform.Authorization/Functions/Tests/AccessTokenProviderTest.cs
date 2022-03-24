using System;
using System.Collections.Generic;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Threading.Tasks;
using Altinn.Common.AccessTokenClient.Configuration;
using Altinn.Common.AccessTokenClient.Services;
using Altinn.Platform.Authorization.Functions.Configuration;
using Altinn.Platform.Authorization.Functions.Services;
using Altinn.Platform.Authorization.Functions.Services.Interfaces;
using FluentAssertions;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace Altinn.Platform.Authorization.Functions.UnitTest;

public class AccessTokenProviderTest
{
    private readonly Mock<IKeyVaultService> _keyVaultServiceMock;
    private readonly Mock<IAccessTokenGenerator> _accessTokenGeneratorMock;
    private readonly IOptions<PlatformSettings> _platformSettings;
    private readonly IOptions<KeyVaultSettings> _keyVaultSettings;
    private readonly IOptions<AccessTokenSettings> _accessTokenSettings;

    public AccessTokenProviderTest()
    {
        _keyVaultServiceMock = new Mock<IKeyVaultService>();
        _accessTokenGeneratorMock = new Mock<IAccessTokenGenerator>();
        _platformSettings = Options.Create(new PlatformSettings());
        _keyVaultSettings = Options.Create(new KeyVaultSettings());
        _accessTokenSettings = Options.Create(new AccessTokenSettings());
    }

    [Fact]
    public async Task GetWithColdCache_Success()
    {
        // Arrange
        _keyVaultServiceMock.Setup(x => x.GetCertificateAsync(It.IsAny<string>(), It.IsAny<string>())).ReturnsAsync(GetBase64Cert());
        _accessTokenGeneratorMock.Setup(x => x.GenerateAccessToken(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<X509Certificate2>())).Returns("abc");
        AccessTokenProvider accessTokenProvider = new(
            _keyVaultServiceMock.Object,
            _accessTokenGeneratorMock.Object,
            _accessTokenSettings,
            _keyVaultSettings,
            _platformSettings);

        // Act
        string token = await accessTokenProvider.GetAccessToken();

        // Assert
        token.Should().NotBeNullOrEmpty();
        _keyVaultServiceMock.Verify(x => x.GetCertificateAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Once());
        _accessTokenGeneratorMock.Verify(x => x.GenerateAccessToken(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<X509Certificate2>()), Times.Once());
    }

    [Fact]
    public async Task GetWithWarmCache_Success()
    {
        // Arrange
        _keyVaultServiceMock.Setup(x => x.GetCertificateAsync(It.IsAny<string>(), It.IsAny<string>())).ReturnsAsync(GetBase64Cert());
        _accessTokenGeneratorMock.Setup(x => x.GenerateAccessToken(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<X509Certificate2>())).Returns("abc");
        AccessTokenProvider accessTokenProvider = new(
            _keyVaultServiceMock.Object,
            _accessTokenGeneratorMock.Object,
            _accessTokenSettings,
            _keyVaultSettings,
            _platformSettings);

        // Act
        string tokenCold = await accessTokenProvider.GetAccessToken();
        string tokenWarm = await accessTokenProvider.GetAccessToken();

        // Assert that we get the same token, and that the services are only hit once
        tokenCold.Should().NotBeNullOrEmpty();
        tokenCold.Should().BeEquivalentTo(tokenWarm);

        _keyVaultServiceMock.Verify(x => x.GetCertificateAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Once());
        _accessTokenGeneratorMock.Verify(x => x.GenerateAccessToken(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<X509Certificate2>()), Times.Once());
    }

    [Fact]
    public async Task CheckConcurrentAccess_Success()
    {
        // Arrange
        _keyVaultServiceMock.Setup(x => x.GetCertificateAsync(It.IsAny<string>(), It.IsAny<string>())).ReturnsAsync(GetBase64Cert());
        _accessTokenGeneratorMock.Setup(x => x.GenerateAccessToken(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<X509Certificate2>())).Returns("abc");
        AccessTokenProvider accessTokenProvider = new(
            _keyVaultServiceMock.Object,
            _accessTokenGeneratorMock.Object,
            _accessTokenSettings,
            _keyVaultSettings,
            _platformSettings);

        // Act
        List<Task> tasks = new List<Task>()
        {
            accessTokenProvider.GetAccessToken(),
            accessTokenProvider.GetAccessToken(),
            accessTokenProvider.GetAccessToken(),
            accessTokenProvider.GetAccessToken(),
            accessTokenProvider.GetAccessToken(),
            accessTokenProvider.GetAccessToken()
        };
         
        await Task.WhenAll(tasks);

        // Assert that the services are just called once
        _keyVaultServiceMock.Verify(x => x.GetCertificateAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Once());
        _accessTokenGeneratorMock.Verify(x => x.GenerateAccessToken(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<X509Certificate2>()), Times.Once());
    }

    private string GetBase64Cert()
    {
        return Convert.ToBase64String(Encoding.ASCII.GetBytes("-----BEGIN CERTIFICATE-----\r\nMIIDAzCCAeugAwIBAgIJANTdO8o3I8x5MA0GCSqGSIb3DQEBCwUAMA4xDDAKBgNV\r\nBAMTA3R0ZDAeFw0yMDA1MjUxMjIxMzdaFw0zMDA1MjQxMjIxMzdaMA4xDDAKBgNV\r\nBAMTA3R0ZDCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAMcfTsXwwLyC\r\nUkIz06eadWJvG3yrzT+ZB2Oy/WPaZosDnPcnZvCDueN+oy0zTx5TyH5gCi1FvzX2\r\n7G2eZEKwQaRPv0yuM+McHy1rXxMSOlH/ebP9KJj3FDMUgZl1DCAjJxSAANdTwdrq\r\nydVg1Crp37AQx8IIEjnBhXsfQh1uPGt1XwgeNyjl00IejxvQOPzd1CofYWwODVtQ\r\nl3PKn1SEgOGcB6wuHNRlnZPCIelQmqxWkcEZiu/NU+kst3NspVUQG2Jf2AF8UWgC\r\nrnrhMQR0Ra1Vi7bWpu6QIKYkN9q0NRHeRSsELOvTh1FgDySYJtNd2xDRSf6IvOiu\r\ntSipl1NZlV0CAwEAAaNkMGIwIAYDVR0OAQH/BBYEFIwq/KbSMzLETdo9NNxj0rz4\r\nqMqVMAwGA1UdEwEB/wQCMAAwDgYDVR0PAQH/BAQDAgWgMCAGA1UdJQEB/wQWMBQG\r\nCCsGAQUFBwMBBggrBgEFBQcDAjANBgkqhkiG9w0BAQsFAAOCAQEAE56UmH5gEYbe\r\n1kVw7nrfH0R9FyVZGeQQWBn4/6Ifn+eMS9mxqe0Lq74Ue1zEzvRhRRqWYi9JlKNf\r\n7QQNrc+DzCceIa1U6cMXgXKuXquVHLmRfqvKHbWHJfIkaY8Mlfy++77UmbkvIzly\r\nT1HVhKKp6Xx0r5koa6frBh4Xo/vKBlEyQxWLWF0RPGpGErnYIosJ41M3Po3nw3lY\r\nf7lmH47cdXatcntj2Ho/b2wGi9+W29teVCDfHn2/0oqc7K0EOY9c2ODLjUvQyPZR\r\nOD2yykpyh9x/YeYHFDYdLDJ76/kIdxN43kLU4/hTrh9tMb1PZF+/4DshpAlRoQuL\r\no8I8avQm/A==\r\n-----END CERTIFICATE-----"));
    }
}

using Altinn.App.Core.EFormidling.Implementation;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Moq;

namespace Altinn.App.Core.Tests.Eformidling.Implementation;

public class EFormidlingLegacyConfigurationProviderTests
{
    private readonly Mock<IAppMetadata> _appMetadataMock = new();
    private readonly EFormidlingLegacyConfigurationProvider _provider;

    public EFormidlingLegacyConfigurationProviderTests()
    {
        _provider = new EFormidlingLegacyConfigurationProvider(_appMetadataMock.Object);
    }

    [Fact]
    public async Task GetLegacyConfiguration_ReturnsConfigFromApplicationMetadata()
    {
        // Arrange
        var applicationMetadata = new ApplicationMetadata("tdd/test")
        {
            EFormidling = new EFormidlingContract
            {
                Receiver = "123456789",
                Process = "urn:no:difi:profile:arkivmelding:administrasjon:ver1.0",
                Standard = "urn:no:difi:arkivmelding:xsd::arkivmelding",
                TypeVersion = "2.0",
                Type = "arkivmelding",
                SecurityLevel = 3,
                DPFShipmentType = "altinn3.skjema",
                DataTypes = new List<string> { "datatype1", "datatype2" },
            },
        };

        _appMetadataMock.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(applicationMetadata);

        // Act
        ValidAltinnEFormidlingConfiguration result = await _provider.GetLegacyConfiguration();

        // Assert
        Assert.Equal("123456789", result.Receiver);
        Assert.Equal("urn:no:difi:profile:arkivmelding:administrasjon:ver1.0", result.Process);
        Assert.Equal("urn:no:difi:arkivmelding:xsd::arkivmelding", result.Standard);
        Assert.Equal("2.0", result.TypeVersion);
        Assert.Equal("arkivmelding", result.Type);
        Assert.Equal(3, result.SecurityLevel);
        Assert.Equal("altinn3.skjema", result.DpfShipmentType);
        Assert.Equal(new[] { "datatype1", "datatype2" }, result.DataTypes);
    }

    [Fact]
    public async Task GetLegacyConfiguration_WithNullDataTypes_ReturnsConfigWithEmptyDataTypes()
    {
        // Arrange
        var applicationMetadata = new ApplicationMetadata("tdd/test")
        {
            EFormidling = new EFormidlingContract
            {
                Process = "urn:no:difi:profile:arkivmelding:administrasjon:ver1.0",
                Standard = "urn:no:difi:arkivmelding:xsd::arkivmelding",
                TypeVersion = "2.0",
                Type = "arkivmelding",
                SecurityLevel = 3,
                DataTypes = null,
            },
        };

        _appMetadataMock.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(applicationMetadata);

        // Act
        ValidAltinnEFormidlingConfiguration result = await _provider.GetLegacyConfiguration();

        // Assert
        Assert.Empty(result.DataTypes);
    }

    [Fact]
    public async Task GetLegacyConfiguration_WhenEFormidlingIsNull_ThrowsApplicationConfigException()
    {
        // Arrange
        var applicationMetadata = new ApplicationMetadata("tdd/test") { EFormidling = null };

        _appMetadataMock.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(applicationMetadata);

        // Act & Assert
        await Assert.ThrowsAsync<ApplicationConfigException>(() => _provider.GetLegacyConfiguration());
    }
}

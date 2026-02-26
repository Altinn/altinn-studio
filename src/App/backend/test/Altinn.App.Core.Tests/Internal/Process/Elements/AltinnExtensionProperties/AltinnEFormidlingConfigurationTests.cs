using Altinn.App.Core.Constants;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;

namespace Altinn.App.Core.Tests.Internal.Process.Elements.AltinnExtensionProperties;

public class AltinnEFormidlingConfigurationTests
{
    [Fact]
    public void Validate_WithAllRequiredFields_ReturnsValidConfiguration()
    {
        // Arrange
        var config = new AltinnEFormidlingConfiguration
        {
            Process = [new AltinnEnvironmentConfig { Value = "process-value" }],
            Standard = [new AltinnEnvironmentConfig { Value = "standard-value" }],
            TypeVersion = [new AltinnEnvironmentConfig { Value = "1.0" }],
            Type = [new AltinnEnvironmentConfig { Value = "type-value" }],
            SecurityLevel = [new AltinnEnvironmentConfig { Value = "3" }],
        };

        // Act
        ValidAltinnEFormidlingConfiguration result = config.Validate(HostingEnvironment.Production);

        // Assert
        Assert.False(result.Disabled);
        Assert.Null(result.Receiver);
        Assert.Equal("process-value", result.Process);
        Assert.Equal("standard-value", result.Standard);
        Assert.Equal("1.0", result.TypeVersion);
        Assert.Equal("type-value", result.Type);
        Assert.Equal(3, result.SecurityLevel);
        Assert.Null(result.DpfShipmentType);
        Assert.Empty(result.DataTypes);
    }

    [Fact]
    public void Validate_WithOptionalFields_ReturnsValidConfiguration()
    {
        // Arrange
        var config = new AltinnEFormidlingConfiguration
        {
            Receiver = [new AltinnEnvironmentConfig { Value = "123456789" }],
            Process = [new AltinnEnvironmentConfig { Value = "process-value" }],
            Standard = [new AltinnEnvironmentConfig { Value = "standard-value" }],
            TypeVersion = [new AltinnEnvironmentConfig { Value = "1.0" }],
            Type = [new AltinnEnvironmentConfig { Value = "type-value" }],
            SecurityLevel = [new AltinnEnvironmentConfig { Value = "3" }],
            DpfShipmentType = [new AltinnEnvironmentConfig { Value = "shipment-type" }],
            DataTypes = [new AltinnEFormidlingDataTypesConfig { DataTypeIds = ["datatype1", "datatype2"] }],
        };

        // Act
        ValidAltinnEFormidlingConfiguration result = config.Validate(HostingEnvironment.Production);

        // Assert
        Assert.Equal("123456789", result.Receiver);
        Assert.Equal("shipment-type", result.DpfShipmentType);
        Assert.Equal(["datatype1", "datatype2"], result.DataTypes);
    }

    [Fact]
    public void Validate_WithDisabledTrue_ReturnsDisabledTrue()
    {
        // Arrange
        var config = new AltinnEFormidlingConfiguration
        {
            Disabled = [new AltinnEnvironmentConfig { Value = "true" }],
            Process = [new AltinnEnvironmentConfig { Value = "process-value" }],
            Standard = [new AltinnEnvironmentConfig { Value = "standard-value" }],
            TypeVersion = [new AltinnEnvironmentConfig { Value = "1.0" }],
            Type = [new AltinnEnvironmentConfig { Value = "type-value" }],
            SecurityLevel = [new AltinnEnvironmentConfig { Value = "3" }],
        };

        // Act
        ValidAltinnEFormidlingConfiguration result = config.Validate(HostingEnvironment.Production);

        // Assert
        Assert.True(result.Disabled);
    }

    [Fact]
    public void Validate_WithDisabledFalse_ReturnsDisabledFalse()
    {
        // Arrange
        var config = new AltinnEFormidlingConfiguration
        {
            Disabled = [new AltinnEnvironmentConfig { Value = "false" }],
            Process = [new AltinnEnvironmentConfig { Value = "process-value" }],
            Standard = [new AltinnEnvironmentConfig { Value = "standard-value" }],
            TypeVersion = [new AltinnEnvironmentConfig { Value = "1.0" }],
            Type = [new AltinnEnvironmentConfig { Value = "type-value" }],
            SecurityLevel = [new AltinnEnvironmentConfig { Value = "3" }],
        };

        // Act
        ValidAltinnEFormidlingConfiguration result = config.Validate(HostingEnvironment.Production);

        // Assert
        Assert.False(result.Disabled);
    }

    [Fact]
    public void Validate_WithoutDisabledField_DefaultsToFalse()
    {
        // Arrange
        var config = new AltinnEFormidlingConfiguration
        {
            Process = [new AltinnEnvironmentConfig { Value = "process-value" }],
            Standard = [new AltinnEnvironmentConfig { Value = "standard-value" }],
            TypeVersion = [new AltinnEnvironmentConfig { Value = "1.0" }],
            Type = [new AltinnEnvironmentConfig { Value = "type-value" }],
            SecurityLevel = [new AltinnEnvironmentConfig { Value = "3" }],
        };

        // Act
        ValidAltinnEFormidlingConfiguration result = config.Validate(HostingEnvironment.Production);

        // Assert
        Assert.False(result.Disabled);
    }

    [Fact]
    public void Validate_WithMissingRequiredFields_ThrowsExceptionWithAllErrors()
    {
        // Arrange - all required fields are missing
        var config = new AltinnEFormidlingConfiguration();

        // Act & Assert
        var exception = Assert.Throws<ApplicationConfigException>(() => config.Validate(HostingEnvironment.Production));

        // Should contain all error messages
        Assert.Contains("No Process configuration found for environment Production", exception.Message);
        Assert.Contains("No Standard configuration found for environment Production", exception.Message);
        Assert.Contains("No TypeVersion configuration found for environment Production", exception.Message);
        Assert.Contains("No Type configuration found for environment Production", exception.Message);
        Assert.Contains("No SecurityLevel configuration found for environment Production", exception.Message);
    }

    [Fact]
    public void Validate_WithInvalidSecurityLevelAndMissingFields_ThrowsExceptionWithAllErrors()
    {
        // Arrange
        var config = new AltinnEFormidlingConfiguration
        {
            SecurityLevel = [new AltinnEnvironmentConfig { Value = "invalid" }],
        };

        // Act & Assert
        var exception = Assert.Throws<ApplicationConfigException>(() => config.Validate(HostingEnvironment.Production));

        // Should contain all error messages
        Assert.Contains("No Process configuration found", exception.Message);
        Assert.Contains("No Standard configuration found", exception.Message);
        Assert.Contains("No TypeVersion configuration found", exception.Message);
        Assert.Contains("No Type configuration found", exception.Message);
        Assert.Contains("SecurityLevel must be a valid integer", exception.Message);
    }

    [Fact]
    public void Validate_WithEnvironmentSpecificConfig_UsesCorrectEnvironment()
    {
        // Arrange
        var config = new AltinnEFormidlingConfiguration
        {
            Process =
            [
                new AltinnEnvironmentConfig { Environment = "prod", Value = "prod-process" },
                new AltinnEnvironmentConfig { Environment = "staging", Value = "staging-process" },
            ],
            Standard = [new AltinnEnvironmentConfig { Value = "standard-value" }],
            TypeVersion = [new AltinnEnvironmentConfig { Value = "1.0" }],
            Type = [new AltinnEnvironmentConfig { Value = "type-value" }],
            SecurityLevel = [new AltinnEnvironmentConfig { Value = "3" }],
        };

        // Act
        ValidAltinnEFormidlingConfiguration result = config.Validate(HostingEnvironment.Production);

        // Assert
        Assert.Equal("prod-process", result.Process);
    }

    [Fact]
    public void Validate_WithGlobalAndEnvironmentSpecificConfig_PrefersEnvironmentSpecific()
    {
        // Arrange
        var config = new AltinnEFormidlingConfiguration
        {
            Process =
            [
                new AltinnEnvironmentConfig { Value = "global-process" }, // No environment = global
                new AltinnEnvironmentConfig { Environment = "prod", Value = "prod-process" },
            ],
            Standard = [new AltinnEnvironmentConfig { Value = "standard-value" }],
            TypeVersion = [new AltinnEnvironmentConfig { Value = "1.0" }],
            Type = [new AltinnEnvironmentConfig { Value = "type-value" }],
            SecurityLevel = [new AltinnEnvironmentConfig { Value = "3" }],
        };

        // Act
        ValidAltinnEFormidlingConfiguration result = config.Validate(HostingEnvironment.Production);

        // Assert
        Assert.Equal("prod-process", result.Process);
    }

    [Fact]
    public void Validate_WithOnlyGlobalConfig_UsesGlobalConfig()
    {
        // Arrange
        var config = new AltinnEFormidlingConfiguration
        {
            Process = [new AltinnEnvironmentConfig { Value = "global-process" }],
            Standard = [new AltinnEnvironmentConfig { Value = "standard-value" }],
            TypeVersion = [new AltinnEnvironmentConfig { Value = "1.0" }],
            Type = [new AltinnEnvironmentConfig { Value = "type-value" }],
            SecurityLevel = [new AltinnEnvironmentConfig { Value = "3" }],
        };

        // Act
        ValidAltinnEFormidlingConfiguration result = config.Validate(HostingEnvironment.Production);

        // Assert
        Assert.Equal("global-process", result.Process);
    }

    [Fact]
    public void Validate_WithEnvironmentSpecificDataTypes_ReturnsCorrectDataTypes()
    {
        // Arrange
        var config = new AltinnEFormidlingConfiguration
        {
            Process = [new AltinnEnvironmentConfig { Value = "process-value" }],
            Standard = [new AltinnEnvironmentConfig { Value = "standard-value" }],
            TypeVersion = [new AltinnEnvironmentConfig { Value = "1.0" }],
            Type = [new AltinnEnvironmentConfig { Value = "type-value" }],
            SecurityLevel = [new AltinnEnvironmentConfig { Value = "3" }],
            DataTypes =
            [
                new AltinnEFormidlingDataTypesConfig
                {
                    Environment = "prod",
                    DataTypeIds = ["prod-datatype1", "prod-datatype2"],
                },
                new AltinnEFormidlingDataTypesConfig { Environment = "staging", DataTypeIds = ["staging-datatype1"] },
            ],
        };

        // Act
        ValidAltinnEFormidlingConfiguration result = config.Validate(HostingEnvironment.Production);

        // Assert
        Assert.Equal(["prod-datatype1", "prod-datatype2"], result.DataTypes);
    }

    [Fact]
    public void Validate_WithGlobalAndEnvironmentSpecificDataTypes_PrefersEnvironmentSpecific()
    {
        // Arrange
        var config = new AltinnEFormidlingConfiguration
        {
            Process = [new AltinnEnvironmentConfig { Value = "process-value" }],
            Standard = [new AltinnEnvironmentConfig { Value = "standard-value" }],
            TypeVersion = [new AltinnEnvironmentConfig { Value = "1.0" }],
            Type = [new AltinnEnvironmentConfig { Value = "type-value" }],
            SecurityLevel = [new AltinnEnvironmentConfig { Value = "3" }],
            DataTypes =
            [
                new AltinnEFormidlingDataTypesConfig { DataTypeIds = ["global-datatype"] },
                new AltinnEFormidlingDataTypesConfig { Environment = "prod", DataTypeIds = ["prod-datatype"] },
            ],
        };

        // Act
        ValidAltinnEFormidlingConfiguration result = config.Validate(HostingEnvironment.Production);

        // Assert
        Assert.Equal(["prod-datatype"], result.DataTypes);
    }
}

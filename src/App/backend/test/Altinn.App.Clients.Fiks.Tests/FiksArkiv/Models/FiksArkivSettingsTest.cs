using System.Text;
using Altinn.App.Clients.Fiks.Exceptions;
using Altinn.App.Clients.Fiks.Extensions;
using Altinn.App.Clients.Fiks.FiksArkiv.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Configuration;

namespace Altinn.App.Clients.Fiks.Tests.FiksArkiv.Models;

public class FiksArkivSettingsTest
{
    [Theory]
    [InlineData("sys", "cls", "title", null, null)]
    [InlineData("sys", "cls", "title", true, null)]
    [InlineData("sys", "cls", "title", false, null)]
    [InlineData("", "cls", "title", null, "SystemId configuration is required")]
    [InlineData("   ", "cls", "title", null, "SystemId configuration is required")]
    [InlineData("sys", "", "title", null, "ClassificationId configuration is required")]
    [InlineData("sys", "cls", "", null, "Title configuration is required")]
    public void FiksArkivClassification_ValidatesCorrectly(
        string systemId,
        string classificationId,
        string title,
        bool? isRestricted,
        string? expectedErrorMessage
    )
    {
        // Arrange
        var classification = new FiksArkivClassification
        {
            SystemId = systemId,
            ClassificationId = classificationId,
            Title = title,
            IsRestricted = isRestricted,
        };

        // Act
        var ex = Record.Exception(() => classification.Validate("TestSetting"));

        // Assert
        if (expectedErrorMessage is null)
        {
            Assert.Null(ex);
            return;
        }

        Assert.NotNull(ex);
        Assert.IsType<FiksArkivConfigurationException>(ex);
        Assert.Contains(expectedErrorMessage, ex.Message);
    }

    [Fact]
    public void FiksArkivClassification_WithSource_ValidatesWithoutExplicitFields()
    {
        // Arrange
        var classification = new FiksArkivClassification { Source = FiksArkivClassificationSource.InstanceOwner };

        // Act
        var ex = Record.Exception(() => classification.Validate("TestSetting"));

        // Assert
        Assert.Null(ex);
    }

    [Theory]
    [InlineData("InstanceOwner")]
    [InlineData("instanceowner")] // config binder is case-insensitive
    public void FiksArkivClassification_Source_BindsFromConfigurationString(string sourceValue)
    {
        // Arrange: bind via the same configuration binder used by .BindConfiguration() in production,
        // proving the documented string form (not just the System.Text.Json numeric form) round-trips.
        var json = $$"""
            {
                "FiksArkivSettings": {
                    "metadata": {
                        "caseFileClassifications": [
                            { "source": "{{sourceValue}}" }
                        ]
                    }
                }
            }
            """;
        var configuration = BuildConfiguration(json);

        // Act
        var settings = configuration.GetSection("FiksArkivSettings").Get<FiksArkivSettings>();

        // Assert
        var classification = Assert.Single(settings!.Metadata!.CaseFileClassifications!);
        Assert.Equal(FiksArkivClassificationSource.InstanceOwner, classification.Source);
        Assert.Null(classification.SystemId);
        Assert.Null(classification.ClassificationId);
        Assert.Null(classification.Title);
    }

    [Fact]
    public void FiksArkivClassification_ExplicitFields_BindFromConfiguration()
    {
        // Arrange
        var json = """
            {
                "FiksArkivSettings": {
                    "metadata": {
                        "caseFileClassifications": [
                            {
                                "systemId": "custom-system",
                                "classificationId": "custom-class",
                                "title": "Custom Title",
                                "isRestricted": true
                            }
                        ]
                    }
                }
            }
            """;
        var configuration = BuildConfiguration(json);

        // Act
        var settings = configuration.GetSection("FiksArkivSettings").Get<FiksArkivSettings>();

        // Assert
        var classification = Assert.Single(settings!.Metadata!.CaseFileClassifications!);
        Assert.Null(classification.Source);
        Assert.Equal("custom-system", classification.SystemId);
        Assert.Equal("custom-class", classification.ClassificationId);
        Assert.Equal("Custom Title", classification.Title);
        Assert.True(classification.IsRestricted);
    }

    [Theory]
    [InlineData("sys", null, null)]
    [InlineData(null, "cls", null)]
    [InlineData(null, null, "title")]
    public void FiksArkivClassification_WithSourceAndExplicitFields_Throws(
        string? systemId,
        string? classificationId,
        string? title
    )
    {
        // Arrange
        var classification = new FiksArkivClassification
        {
            Source = FiksArkivClassificationSource.InstanceOwner,
            SystemId = systemId,
            ClassificationId = classificationId,
            Title = title,
        };

        // Act
        var ex = Record.Exception(() => classification.Validate("TestSetting"));

        // Assert
        Assert.NotNull(ex);
        Assert.IsType<FiksArkivConfigurationException>(ex);
        Assert.Contains("Source cannot be combined with", ex.Message);
    }

    [Theory]
    [InlineData(null)]
    [InlineData(true)]
    [InlineData(false)]
    public void FiksArkivClassification_ToKlassifikasjon_MapsAllFields(bool? isRestricted)
    {
        // Arrange
        var classification = new FiksArkivClassification
        {
            SystemId = "system-1",
            ClassificationId = "class-1",
            Title = "The Title",
            IsRestricted = isRestricted,
        };

        // Act
        var result = classification.ToKlassifikasjon();

        // Assert
        Assert.Equal("system-1", result.KlassifikasjonssystemID);
        Assert.Equal("class-1", result.KlasseID);
        Assert.Equal("The Title", result.Tittel);
        Assert.Equal(isRestricted, result.ErSkjermet);
    }

    [Theory]
    [InlineData("datatype1", "customfile.xml", null, "customfile.xml")]
    [InlineData("datatype2", null, ".pdf", "datatype2.pdf")]
    public void FiksArkivDataTypeSettings_GetFilenameOrDefault_ResolvesCorrectly(
        string datatype,
        string? filename,
        string? defaultExtension,
        string expectedResult
    )
    {
        // Arrange
        var settings = new FiksArkivDataTypeSettings { DataType = datatype, Filename = filename };

        // Act
        var result = settings.GetFilenameOrDefault(defaultExtension!);

        // Assert
        Assert.Equal(expectedResult, result);
    }

    [Theory]
    [InlineData("valid-datatype", "file.xml", new[] { "valid-datatype" }, true, null)]
    [InlineData("valid-datatype", null, new[] { "valid-datatype" }, false, null)]
    [InlineData("valid-datatype", null, new[] { "valid-datatype" }, true, "Filename configuration is required")]
    [InlineData("invalid-datatype", null, new[] { "valid-datatype" }, false, "DataType mismatch")]
    public void FiksArkivDataTypeSettings_ValidatesCorrectly(
        string datatype,
        string? filename,
        IEnumerable<string> dataTypeIds,
        bool requireFilename,
        string? expectedErrorMessage
    )
    {
        // Arrange
        var settings = new FiksArkivDataTypeSettings { DataType = datatype, Filename = filename };

        // Act
        var ex = Record.Exception(() =>
            settings.Validate("TestSetting", dataTypeIds.Select(x => new DataType { Id = x }).ToList(), requireFilename)
        );

        // Assert
        if (expectedErrorMessage is null)
        {
            Assert.Null(ex);
            return;
        }

        Assert.NotNull(ex);
        Assert.IsType<FiksArkivConfigurationException>(ex);
        Assert.Contains(expectedErrorMessage, ex.Message);
    }

    [Theory]
    [InlineData(null, null)]
    [InlineData("PDF/A", null)]
    [InlineData("anything goes verbatim", null)]
    [InlineData("", "Format.Code cannot be empty or contain only whitespace")]
    [InlineData("   ", "Format.Code cannot be empty or contain only whitespace")]
    public void FiksArkivDataTypeSettings_ValidatesDocumentFormat(string? code, string? expectedErrorMessage)
    {
        // Arrange
        var settings = new FiksArkivDataTypeSettings
        {
            DataType = "valid-datatype",
            Format = code is null ? null : new FiksArkivCode { Code = code },
        };

        // Act
        var ex = Record.Exception(() => settings.Validate("TestSetting", [new DataType { Id = "valid-datatype" }]));

        // Assert
        if (expectedErrorMessage is null)
        {
            Assert.Null(ex);
            return;
        }

        Assert.NotNull(ex);
        Assert.IsType<FiksArkivConfigurationException>(ex);
        Assert.Contains(expectedErrorMessage, ex.Message);
    }

    [Theory]
    [InlineData(null, null)]
    [InlineData("P", null)]
    [InlineData("A", null)]
    [InlineData("", "Variant.Code cannot be empty or contain only whitespace")]
    [InlineData("   ", "Variant.Code cannot be empty or contain only whitespace")]
    public void FiksArkivDataTypeSettings_ValidatesDocumentVariant(string? code, string? expectedErrorMessage)
    {
        // Arrange
        var settings = new FiksArkivDataTypeSettings
        {
            DataType = "valid-datatype",
            Variant = code is null ? null : new FiksArkivCode { Code = code },
        };

        // Act
        var ex = Record.Exception(() => settings.Validate("TestSetting", [new DataType { Id = "valid-datatype" }]));

        // Assert
        if (expectedErrorMessage is null)
        {
            Assert.Null(ex);
            return;
        }

        Assert.NotNull(ex);
        Assert.IsType<FiksArkivConfigurationException>(ex);
        Assert.Contains(expectedErrorMessage, ex.Message);
    }

    private static IConfiguration BuildConfiguration(string json)
    {
        using var stream = new MemoryStream(Encoding.UTF8.GetBytes(json));
        return new ConfigurationBuilder().AddJsonStream(stream).Build();
    }
}

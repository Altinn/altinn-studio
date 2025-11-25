using Altinn.App.Clients.Fiks.Exceptions;
using Altinn.App.Clients.Fiks.FiksArkiv.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Clients.Fiks.Tests.FiksArkiv.Models;

public class FiksArkivSettingsTest
{
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
}

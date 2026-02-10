using Altinn.App.Core.Features.Bootstrap;

namespace Altinn.App.Core.Tests.Features.Bootstrap;

public class LayoutAnalysisServiceTests
{
    private readonly LayoutAnalysisService _service = new();

    [Fact]
    public void GetReferencedDataTypes_ReturnsDefaultDataType()
    {
        // Arrange
        var layoutsJson = """{"page1": {"data": {"layout": []}}}""";
        var defaultDataType = "default";

        // Act
        var result = _service.GetReferencedDataTypes(layoutsJson, defaultDataType);

        // Assert
        Assert.Single(result);
        Assert.Contains("default", result);
    }

    [Fact]
    public void GetReferencedDataTypes_ExtractsDataTypeFromBindings()
    {
        // Arrange
        var layoutsJson = """
            {
                "page1": {
                    "data": {
                        "layout": [
                            {
                                "id": "field1",
                                "type": "Input",
                                "dataModelBindings": {
                                    "simpleBinding": {
                                        "field": "Name",
                                        "dataType": "model2"
                                    }
                                }
                            }
                        ]
                    }
                }
            }
            """;
        var defaultDataType = "default";

        // Act
        var result = _service.GetReferencedDataTypes(layoutsJson, defaultDataType);

        // Assert
        Assert.Equal(2, result.Count);
        Assert.Contains("default", result);
        Assert.Contains("model2", result);
    }

    [Fact]
    public void GetStaticOptionIds_ExtractsOptionsId()
    {
        // Arrange
        var layoutsJson = """
            {
                "page1": {
                    "data": {
                        "layout": [
                            {
                                "id": "dropdown1",
                                "type": "Dropdown",
                                "optionsId": "countries"
                            }
                        ]
                    }
                }
            }
            """;

        // Act
        var result = _service.GetStaticOptionIds(layoutsJson);

        // Assert
        Assert.Single(result);
        Assert.Contains("countries", result);
    }

    [Fact]
    public void GetStaticOptionIds_ExcludesOptionsWithMapping()
    {
        // Arrange
        var layoutsJson = """
            {
                "page1": {
                    "data": {
                        "layout": [
                            {
                                "id": "dropdown1",
                                "type": "Dropdown",
                                "optionsId": "dynamic",
                                "mapping": {"someField": "otherField"}
                            }
                        ]
                    }
                }
            }
            """;

        // Act
        var result = _service.GetStaticOptionIds(layoutsJson);

        // Assert
        Assert.Empty(result);
    }

    [Fact]
    public void GetStaticOptionIds_ExcludesOptionsWithDynamicQueryParameters()
    {
        // Arrange
        var layoutsJson = """
            {
                "page1": {
                    "data": {
                        "layout": [
                            {
                                "id": "dropdown1",
                                "type": "Dropdown",
                                "optionsId": "dynamic",
                                "queryParameters": {
                                    "param1": ["component", "someField"]
                                }
                            }
                        ]
                    }
                }
            }
            """;

        // Act
        var result = _service.GetStaticOptionIds(layoutsJson);

        // Assert
        Assert.Empty(result);
    }

    [Fact]
    public void GetStaticOptionIds_IncludesOptionsWithStaticQueryParameters()
    {
        // Arrange
        var layoutsJson = """
            {
                "page1": {
                    "data": {
                        "layout": [
                            {
                                "id": "dropdown1",
                                "type": "Dropdown",
                                "optionsId": "filteredCountries",
                                "queryParameters": {
                                    "region": "europe"
                                }
                            }
                        ]
                    }
                }
            }
            """;

        // Act
        var result = _service.GetStaticOptionIds(layoutsJson);

        // Assert
        Assert.Single(result);
        Assert.Contains("filteredCountries", result);
    }

    [Fact]
    public void GetStaticOptionIds_ExtractsOptionLabelExpressions()
    {
        // Arrange
        var layoutsJson = """
            {
                "page1": {
                    "data": {
                        "layout": [
                            {
                                "id": "text1",
                                "type": "Paragraph",
                                "textResourceBindings": {
                                    "title": ["optionLabel", "countries", "NO"]
                                }
                            }
                        ]
                    }
                }
            }
            """;

        // Act
        var result = _service.GetStaticOptionIds(layoutsJson);

        // Assert
        Assert.Single(result);
        Assert.Contains("countries", result);
    }
}

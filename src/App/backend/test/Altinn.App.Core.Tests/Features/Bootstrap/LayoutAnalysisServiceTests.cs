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
    public void GetStaticOptions_ExtractsOptionsId()
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
        var result = _service.GetStaticOptions(layoutsJson);

        // Assert
        Assert.Single(result.Keys);
        Assert.Contains("countries", result.Keys);
        Assert.Single(result["countries"]);
        Assert.Empty(result["countries"][0]);
    }

    [Fact]
    public void GetStaticOptions_ExcludesOptionsWithMapping()
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
        var result = _service.GetStaticOptions(layoutsJson);

        // Assert
        Assert.Empty(result);
    }

    [Fact]
    public void GetStaticOptions_ExcludesOptionsWithDynamicQueryParameters()
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
        var result = _service.GetStaticOptions(layoutsJson);

        // Assert
        Assert.Empty(result);
    }

    [Fact]
    public void GetStaticOptions_IncludesOptionsWithStaticQueryParameters()
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
        var result = _service.GetStaticOptions(layoutsJson);

        // Assert
        Assert.Single(result.Keys);
        Assert.Contains("filteredCountries", result.Keys);
        Assert.Single(result["filteredCountries"]);
        Assert.Equal("europe", result["filteredCountries"][0]["region"]);
    }

    [Fact]
    public void GetStaticOptions_ExtractsOptionLabelExpressions()
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
        var result = _service.GetStaticOptions(layoutsJson);

        // Assert
        Assert.Single(result.Keys);
        Assert.Contains("countries", result.Keys);
        Assert.Single(result["countries"]);
        Assert.Empty(result["countries"][0]);
    }

    [Fact]
    public void GetStaticOptions_IncludesMultipleStaticVariantsForSameOptionsId()
    {
        var layoutsJson = """
            {
                "page1": {
                    "data": {
                        "layout": [
                            {
                                "id": "dropdown1",
                                "type": "Dropdown",
                                "optionsId": "countries",
                                "queryParameters": {
                                    "region": "europe"
                                }
                            },
                            {
                                "id": "dropdown2",
                                "type": "Dropdown",
                                "optionsId": "countries",
                                "queryParameters": {
                                    "region": "asia"
                                }
                            }
                        ]
                    }
                }
            }
            """;

        var result = _service.GetStaticOptions(layoutsJson);

        Assert.Single(result.Keys);
        Assert.Equal(2, result["countries"].Count);
        Assert.Contains(result["countries"], v => v.TryGetValue("region", out var value) && value == "europe");
        Assert.Contains(result["countries"], v => v.TryGetValue("region", out var value) && value == "asia");
    }
}

using Altinn.App.Core.Features.Bootstrap;

namespace Altinn.App.Core.Tests.Features.Bootstrap;

public class LayoutAnalysisServiceTests
{
    [Fact]
    public void GetReferencedDataTypes_ReturnsDefaultDataType()
    {
        var layoutsJson = """{"page1": {"data": {"layout": []}}}""";
        var defaultDataType = "default";

        var result = LayoutAnalysisService.GetReferencedDataTypes(layoutsJson, defaultDataType);

        Assert.Single(result);
        Assert.Contains("default", result);
    }

    [Fact]
    public void GetReferencedDataTypes_ExtractsDataTypeFromBindings()
    {
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

        var result = LayoutAnalysisService.GetReferencedDataTypes(layoutsJson, defaultDataType);

        Assert.Equal(2, result.Count);
        Assert.Contains("default", result);
        Assert.Contains("model2", result);
    }

    [Fact]
    public void GetStaticOptionsReferences_ExtractsOptionsId_AndMarksStaticWhenNoConfig()
    {
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

        var result = LayoutAnalysisService.GetStaticOptionsReferences(layoutsJson);

        Assert.Contains("countries", result.AllReferencedOptionIds);
        Assert.Contains("countries", result.StaticallyConfiguredOptionIds);
    }

    [Fact]
    public void GetStaticOptionsReferences_NonEmptyMapping_IsNotStaticByConfig()
    {
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

        var result = LayoutAnalysisService.GetStaticOptionsReferences(layoutsJson);

        Assert.Contains("dynamic", result.AllReferencedOptionIds);
        Assert.DoesNotContain("dynamic", result.StaticallyConfiguredOptionIds);
    }

    [Fact]
    public void GetStaticOptionsReferences_NonEmptyQueryParameters_IsNotStaticByConfig()
    {
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
                                    "region": "europe"
                                }
                            }
                        ]
                    }
                }
            }
            """;

        var result = LayoutAnalysisService.GetStaticOptionsReferences(layoutsJson);

        Assert.Contains("dynamic", result.AllReferencedOptionIds);
        Assert.DoesNotContain("dynamic", result.StaticallyConfiguredOptionIds);
    }

    [Fact]
    public void GetStaticOptionsReferences_EmptyMappingAndQueryParameters_AreStaticByConfig()
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
                                "mapping": {},
                                "queryParameters": {}
                            }
                        ]
                    }
                }
            }
            """;

        var result = LayoutAnalysisService.GetStaticOptionsReferences(layoutsJson);

        Assert.Contains("countries", result.AllReferencedOptionIds);
        Assert.Contains("countries", result.StaticallyConfiguredOptionIds);
    }

    [Fact]
    public void GetStaticOptionsReferences_ExtractsOptionLabelExpressions_AndMarksStatic()
    {
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

        var result = LayoutAnalysisService.GetStaticOptionsReferences(layoutsJson);

        Assert.Contains("countries", result.AllReferencedOptionIds);
        Assert.Contains("countries", result.StaticallyConfiguredOptionIds);
    }

    [Fact]
    public void GetStaticOptionsReferences_StaticAndDynamicReferencesForSameId_MarkedStatic()
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
                                "mapping": {"a": "b"}
                            },
                            {
                                "id": "dropdown2",
                                "type": "Dropdown",
                                "optionsId": "countries"
                            }
                        ]
                    }
                }
            }
            """;

        var result = LayoutAnalysisService.GetStaticOptionsReferences(layoutsJson);

        Assert.Contains("countries", result.AllReferencedOptionIds);
        Assert.Contains("countries", result.StaticallyConfiguredOptionIds);
    }
}

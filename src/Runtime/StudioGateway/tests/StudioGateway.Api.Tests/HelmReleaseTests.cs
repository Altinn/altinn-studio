using System.Text.Json;
using StudioGateway.Api.Clients.K8s;

namespace StudioGateway.Api.Tests;

public sealed class HelmReleaseTests
{
    [Fact]
    public void GetAnnotations_WhenAnnotationsIsNull_ReturnsEmpty()
    {
        var helmRelease = Parse(
            """
            {
              "metadata": {
                "annotations": null
              }
            }
            """
        );

        var annotations = helmRelease.GetAnnotations();

        Assert.Empty(annotations);
    }

    [Fact]
    public void GetAnnotations_WhenAnnotationsIsNotObject_ReturnsEmpty()
    {
        var helmRelease = Parse(
            """
            {
              "metadata": {
                "annotations": "invalid"
              }
            }
            """
        );

        var annotations = helmRelease.GetAnnotations();

        Assert.Empty(annotations);
    }

    [Fact]
    public void GetAnnotations_WhenAnnotationValuesAreNotStrings_IgnoresInvalidValues()
    {
        var helmRelease = Parse(
            """
            {
              "metadata": {
                "annotations": {
                  "valid": "value",
                  "invalid": 1
                }
              }
            }
            """
        );

        var annotations = helmRelease.GetAnnotations();

        Assert.Single(annotations);
        Assert.Equal("value", annotations["valid"]);
    }

    private static HelmRelease Parse(string json)
    {
        using var document = JsonDocument.Parse(json);
        return new HelmRelease(document.RootElement);
    }
}

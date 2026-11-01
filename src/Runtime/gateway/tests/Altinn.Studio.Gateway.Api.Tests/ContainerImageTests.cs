using Altinn.Studio.Gateway.Api.Clients.K8s;

namespace Altinn.Studio.Gateway.Api.Tests;

public sealed class ContainerImageTests
{
    [Theory]
    [InlineData("altinntjenester.azurecr.io/ttd/my-app:9cf6fc1", "9cf6fc1")]
    [InlineData("registry:5000/ttd/my-app:1.2.3", "1.2.3")]
    [InlineData("ttd/my-app:1.2.3@sha256:4f1a", "1.2.3")]
    [InlineData("my-app:latest", "latest")]
    public void TagOf_ReturnsTheTag(string image, string expected) =>
        Assert.Equal(expected, ContainerImage.TagOf(image));

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("ttd/my-app")]
    [InlineData("registry:5000/ttd/my-app")]
    [InlineData("ttd/my-app@sha256:4f1a")]
    [InlineData("ttd/my-app:")]
    public void TagOf_WithoutTag_ReturnsNull(string? image) => Assert.Null(ContainerImage.TagOf(image));
}

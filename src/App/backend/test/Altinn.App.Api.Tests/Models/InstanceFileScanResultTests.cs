using Altinn.App.Api.Models;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Enums;
using FluentAssertions;

namespace Altinn.App.Api.Tests.Models;

public class InstanceFileScanResultTests
{
    //TODO: Add test for empty list and NotApplicable status
    [Fact]
    public void ZeroDataElement_AggregatedStatusShouldBeNotApplicable()
    {
        var instanceFileScanResult = new InstanceFileScanResult(new InstanceIdentifier(12345, Guid.NewGuid()));

        instanceFileScanResult.FileScanResult.Should().Be(FileScanResult.NotApplicable);
    }

    [Theory]
    [InlineData(FileScanResult.Pending)]
    [InlineData(FileScanResult.Infected)]
    [InlineData(FileScanResult.Clean)]
    [InlineData(FileScanResult.NotApplicable)]
    public void OneDataElement_AggregatedStatusShouldBeSame(FileScanResult fileScanResult)
    {
        var instanceFileScanResult = new InstanceFileScanResult(new InstanceIdentifier(12345, Guid.NewGuid()));

        instanceFileScanResult.AddFileScanResult(
            new DataElementFileScanResult() { Id = Guid.NewGuid().ToString(), FileScanResult = fileScanResult }
        );

        instanceFileScanResult.FileScanResult.Should().Be(fileScanResult);
    }

    [Theory]
    [InlineData(FileScanResult.Pending)]
    [InlineData(FileScanResult.Infected)]
    [InlineData(FileScanResult.Clean)]
    [InlineData(FileScanResult.NotApplicable)]
    public void AtLeastOneDataElementInfected_AggregatedStatusShouldBeInfected(FileScanResult fileScanResult)
    {
        var instanceFileScanResult = new InstanceFileScanResult(new InstanceIdentifier(12345, Guid.NewGuid()));

        instanceFileScanResult.AddFileScanResult(
            new DataElementFileScanResult() { Id = Guid.NewGuid().ToString(), FileScanResult = fileScanResult }
        );
        instanceFileScanResult.AddFileScanResult(
            new DataElementFileScanResult() { Id = Guid.NewGuid().ToString(), FileScanResult = FileScanResult.Infected }
        );

        instanceFileScanResult.FileScanResult.Should().Be(FileScanResult.Infected);
    }

    [Fact]
    public void AllDataElemementsClean_AggregatedStatusShouldBeClean()
    {
        var instanceFileScanResult = new InstanceFileScanResult(new InstanceIdentifier(12345, Guid.NewGuid()));

        instanceFileScanResult.AddFileScanResult(
            new DataElementFileScanResult() { Id = Guid.NewGuid().ToString(), FileScanResult = FileScanResult.Clean }
        );
        instanceFileScanResult.AddFileScanResult(
            new DataElementFileScanResult() { Id = Guid.NewGuid().ToString(), FileScanResult = FileScanResult.Clean }
        );

        instanceFileScanResult.FileScanResult.Should().Be(FileScanResult.Clean);
    }

    [Fact]
    public void OneCleanOnePending_AggregatedStatusShouldBePending()
    {
        var instanceFileScanResult = new InstanceFileScanResult(new InstanceIdentifier(12345, Guid.NewGuid()));

        instanceFileScanResult.AddFileScanResult(
            new DataElementFileScanResult() { Id = Guid.NewGuid().ToString(), FileScanResult = FileScanResult.Clean }
        );
        instanceFileScanResult.AddFileScanResult(
            new DataElementFileScanResult() { Id = Guid.NewGuid().ToString(), FileScanResult = FileScanResult.Pending }
        );

        instanceFileScanResult.FileScanResult.Should().Be(FileScanResult.Pending);
    }

    [Fact]
    public void MultiplePending_AggregatedStatusShouldBePending()
    {
        var instanceFileScanResult = new InstanceFileScanResult(new InstanceIdentifier(12345, Guid.NewGuid()));

        instanceFileScanResult.AddFileScanResult(
            new DataElementFileScanResult() { Id = Guid.NewGuid().ToString(), FileScanResult = FileScanResult.Pending }
        );
        instanceFileScanResult.AddFileScanResult(
            new DataElementFileScanResult() { Id = Guid.NewGuid().ToString(), FileScanResult = FileScanResult.Pending }
        );

        instanceFileScanResult.FileScanResult.Should().Be(FileScanResult.Pending);
    }

    [Fact]
    public void OneOfEach_AggregatedStatusShouldBeInfected()
    {
        var instanceFileScanResult = new InstanceFileScanResult(new InstanceIdentifier(12345, Guid.NewGuid()));

        instanceFileScanResult.AddFileScanResult(
            new DataElementFileScanResult() { Id = Guid.NewGuid().ToString(), FileScanResult = FileScanResult.Infected }
        );
        instanceFileScanResult.AddFileScanResult(
            new DataElementFileScanResult() { Id = Guid.NewGuid().ToString(), FileScanResult = FileScanResult.Pending }
        );
        instanceFileScanResult.AddFileScanResult(
            new DataElementFileScanResult() { Id = Guid.NewGuid().ToString(), FileScanResult = FileScanResult.Clean }
        );
        instanceFileScanResult.AddFileScanResult(
            new DataElementFileScanResult()
            {
                Id = Guid.NewGuid().ToString(),
                FileScanResult = FileScanResult.NotApplicable,
            }
        );

        instanceFileScanResult.FileScanResult.Should().Be(FileScanResult.Infected);
    }
}

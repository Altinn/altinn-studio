using System;
using Altinn.App.Core.Internal.Data;
using Altinn.App.SourceGenerator.Integration.Tests.Models;
using Xunit;
using Xunit.Abstractions;

namespace Altinn.App.SourceGenerator.Integration.Tests.UnitTest;

public class TestFormDataWrapperFactory(ITestOutputHelper testOutputHelper)
{
    [Fact]
    public void Create_ShouldReturnValidWrapper()
    {
        // Arrange
        var model = new Skjema();
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        var wrapper = FormDataWrapperFactory.Create(model);
        testOutputHelper.WriteLine($"First execution {stopwatch.Elapsed.TotalMicroseconds} microseconds");
        Assert.IsType<Altinn_App_SourceGenerator_Integration_Tests_Models_SkjemaFormDataWrapper>(wrapper);
        Assert.IsNotType<ReflectionFormDataWrapper>(wrapper);

        // Act
        var result = wrapper.BackingData<Skjema>();

        // Assert
        Assert.NotNull(result);
        Assert.Equal(model, result);

        // Measure second execution time
        stopwatch.Restart();
        var wrapper2 = FormDataWrapperFactory.Create(model);
        stopwatch.Stop();
        testOutputHelper.WriteLine($"Second execution {stopwatch.Elapsed.TotalMicroseconds} microseconds");
        Assert.IsType<Altinn_App_SourceGenerator_Integration_Tests_Models_SkjemaFormDataWrapper>(wrapper2);
        Assert.IsNotType<ReflectionFormDataWrapper>(wrapper2);
        Assert.NotSame(wrapper, wrapper2);

        // Assert that the second execution is very fast (due to caching)
        // Would like to assert lower, but lets be conservative to avoid flaky tests
        Assert.InRange(stopwatch.Elapsed, TimeSpan.Zero, TimeSpan.FromMilliseconds(2));
    }
}

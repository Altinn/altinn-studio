using System;
using System.Linq;
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

        // Measure execution time (take best of 3 to avoid flaky results from GC/JIT)
        var samples = new TimeSpan[3];
        for (int i = 0; i < samples.Length; i++)
        {
            GC.Collect();
            GC.WaitForPendingFinalizers();

            stopwatch.Restart();
            var w = FormDataWrapperFactory.Create(model);
            stopwatch.Stop();
            samples[i] = stopwatch.Elapsed;

            testOutputHelper.WriteLine($"Sample {i + 1}: {stopwatch.Elapsed.TotalMicroseconds} microseconds");
            Assert.IsType<Altinn_App_SourceGenerator_Integration_Tests_Models_SkjemaFormDataWrapper>(w);
            Assert.IsNotType<ReflectionFormDataWrapper>(w);
            Assert.NotSame(wrapper, w);
        }

        var fastest = samples.Min();
        testOutputHelper.WriteLine($"Fastest: {fastest.TotalMicroseconds} microseconds");
        Assert.InRange(fastest, TimeSpan.Zero, TimeSpan.FromMilliseconds(1));
    }
}

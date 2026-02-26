using Altinn.App.Core.Helpers.DataModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.SourceGenerator.Integration.Tests.Models;
using Xunit;

namespace Altinn.App.SourceGenerator.Integration.Tests.UnitTest;

/// <summary>
/// Tests for the Set method on both source-generated and reflection-based implementations
/// to ensure they maintain identical semantics.
/// </summary>
public class TestGeneratedSetter
{
    /// <summary>
    /// Create a fresh instance of Skjema for testing.
    /// </summary>
    private static Skjema CreateTestSkjema() =>
        new Skjema()
        {
            Skjemanummer = "1243",
            Skjemaversjon = "x4",
            Skjemainnhold =
            [
                new SkjemaInnhold()
                {
                    Navn = "navn",
                    Alder = 42,
                    Deltar = true,
                },
                new SkjemaInnhold()
                {
                    Navn = "navn2",
                    Alder = 43,
                    Deltar = false,
                    Adresse = new() { Gate = "gate", Postnummer = 1234 },
                    TidligereAdresse =
                    [
                        new() { Gate = "gate1", Postnummer = 1235 },
                        new()
                        {
                            Gate = "gate2",
                            Postnummer = 1236,
                            Tags = ["tag1", "tag2"],
                        },
                    ],
                },
                null, // To test null item in list
            ],
            EierAdresse = new() { Gate = "owner street", Postnummer = 5000 },
        };

    [Theory]
    [InlineData("skjemanummer", "new-value")]
    [InlineData("skjemaversjon", "v2.0")]
    [InlineData("skjemainnhold[0].navn", "updated-name")]
    [InlineData("skjemainnhold[0].alder", 50)]
    [InlineData("skjemainnhold[0].deltar", false)]
    [InlineData("skjemainnhold[1].navn", "another-name")]
    [InlineData("skjemainnhold[1].alder", 99)]
    [InlineData("skjemainnhold[1].deltar", true)]
    [InlineData("skjemainnhold[1].adresse.gate", "new-street")]
    [InlineData("skjemainnhold[1].adresse.postnummer", 9999)]
    [InlineData("skjemainnhold[1].tidligere-adresse[0].gate", "old-street-updated")]
    [InlineData("skjemainnhold[1].tidligere-adresse[0].postnummer", 7777)]
    [InlineData("skjemainnhold[1].tidligere-adresse[1].tags[0]", "new-tag")]
    [InlineData("eierAdresse.gate", "owner-updated")]
    [InlineData("eierAdresse.postnummer", 6000)]
    public void TestSet_SimpleValues_BothImplementations(string path, object value)
    {
        // Test source-generated implementation
        var generatedSkjema = CreateTestSkjema();
        IFormDataWrapper generatedWrapper =
            new Altinn_App_SourceGenerator_Integration_Tests_Models_SkjemaFormDataWrapper(generatedSkjema);
        var generatedResult = generatedWrapper.Set(path, ExpressionValue.FromObject(value));
        Assert.True(generatedResult, $"Source-generated Set failed for path: {path}");
        var generatedActual = generatedWrapper.Get(path);

        // Test reflection implementation
        var reflectionSkjema = CreateTestSkjema();
        IFormDataWrapper reflectionWrapper = new ReflectionFormDataWrapper(reflectionSkjema);
        var reflectionResult = reflectionWrapper.Set(path, ExpressionValue.FromObject(value));
        Assert.True(reflectionResult, $"Reflection Set failed for path: {path}");
        var reflectionActual = reflectionWrapper.Get(path);

        // Verify both implementations produce the same result
        Assert.Equal(generatedActual, reflectionActual);

        // Verify the value was actually set correctly
        Assert.Equal(value, generatedActual);
        Assert.Equal(value, reflectionActual);
    }

    [Theory]
    [InlineData("skjemainnhold[0].alder", "25")] // string to int
    [InlineData("skjemainnhold[0].alder", 30.5)] // double to int
    [InlineData("skjemainnhold[0].deltar", "true")] // string to bool
    [InlineData("skjemainnhold[0].deltar", 1)] // int to bool
    [InlineData("skjemainnhold[1].adresse.postnummer", "8888")] // string to int
    [InlineData("skjemainnhold[0].navn", 12345)] // int to string
    public void TestSet_TypeConversion_BothImplementations(string path, object value)
    {
        // Test source-generated implementation
        var generatedSkjema = CreateTestSkjema();
        IFormDataWrapper generatedWrapper =
            new Altinn_App_SourceGenerator_Integration_Tests_Models_SkjemaFormDataWrapper(generatedSkjema);
        var generatedResult = generatedWrapper.Set(path, ExpressionValue.FromObject(value));

        // Test reflection implementation
        var reflectionSkjema = CreateTestSkjema();
        IFormDataWrapper reflectionWrapper = new ReflectionFormDataWrapper(reflectionSkjema);
        var reflectionResult = reflectionWrapper.Set(path, ExpressionValue.FromObject(value));

        // Both should succeed or both should fail
        Assert.Equal(generatedResult, reflectionResult);

        if (generatedResult)
        {
            // If both succeeded, verify they produce the same result
            var generatedActual = generatedWrapper.Get(path);
            var reflectionActual = reflectionWrapper.Get(path);
            Assert.Equal(generatedActual, reflectionActual);
        }
    }

    [Theory]
    [InlineData("skjemanummer", null)]
    [InlineData("skjemaversjon", null)]
    [InlineData("skjemainnhold[0].navn", null)]
    [InlineData("skjemainnhold[0].alder", null)]
    [InlineData("skjemainnhold[1].adresse.gate", null)]
    public void TestSet_NullValues_BothImplementations(string path, object? value)
    {
        // Test source-generated implementation
        var generatedSkjema = CreateTestSkjema();
        IFormDataWrapper generatedWrapper =
            new Altinn_App_SourceGenerator_Integration_Tests_Models_SkjemaFormDataWrapper(generatedSkjema);
        var generatedResult = generatedWrapper.Set(path, ExpressionValue.FromObject(value));

        // Test reflection implementation
        var reflectionSkjema = CreateTestSkjema();
        IFormDataWrapper reflectionWrapper = new ReflectionFormDataWrapper(reflectionSkjema);
        var reflectionResult = reflectionWrapper.Set(path, ExpressionValue.FromObject(value));

        // Both should have the same success/failure result
        Assert.Equal(generatedResult, reflectionResult);

        if (generatedResult)
        {
            // If both succeeded, verify they produce the same result
            var generatedActual = generatedWrapper.Get(path);
            var reflectionActual = reflectionWrapper.Get(path);
            Assert.Null(generatedActual);
            Assert.Null(reflectionActual);
        }
    }

    [Theory]
    [InlineData("")] // empty path
    [InlineData("not-exists")] // non-existent path
    [InlineData("skjemanummer.not-exists")] // invalid nested path on primitive
    [InlineData("skjemainnhold[99].navn")] // out of bounds index - returns false
    [InlineData("skjemainnhold[0].not-exists")] // non-existent property
    [InlineData("skjemainnhold[1].adresse.not-exists")] // non-existent nested property
    [InlineData("skjemainnhold[2].navn")] // null item in list (Might reconsider this test case)
    public void TestSet_InvalidPaths_BothImplementations(string path)
    {
        // Test source-generated implementation
        var generatedSkjema = CreateTestSkjema();
        IFormDataWrapper generatedWrapper =
            new Altinn_App_SourceGenerator_Integration_Tests_Models_SkjemaFormDataWrapper(generatedSkjema);
        var generatedResult = generatedWrapper.Set(path, "test-value");

        // Test reflection implementation
        var reflectionSkjema = CreateTestSkjema();
        IFormDataWrapper reflectionWrapper = new ReflectionFormDataWrapper(reflectionSkjema);
        var reflectionResult = reflectionWrapper.Set(path, "test-value");

        // Both should have the same behavior
        Assert.Equal(generatedResult, reflectionResult);
    }

    [Fact]
    public void TestSet_NegativeIndex_BothImplementations()
    {
        // Test negative index handling
        var generatedSkjema = CreateTestSkjema();
        IFormDataWrapper generatedWrapper =
            new Altinn_App_SourceGenerator_Integration_Tests_Models_SkjemaFormDataWrapper(generatedSkjema);
        Assert.Throws<DataModelException>(() => generatedWrapper.Set("skjemainnhold[-1].navn", "value"));

        var reflectionSkjema = CreateTestSkjema();
        IFormDataWrapper reflectionWrapper = new ReflectionFormDataWrapper(reflectionSkjema);
        Assert.Throws<DataModelException>(() => reflectionWrapper.Set("skjemainnhold[-1].navn", "value"));
    }

    [Fact]
    public void TestSet_WithLongPath_BothImplementations()
    {
        // Test paths longer than stackalloc threshold (512 chars)
        var minLengthToUseBufferInsteadOfStackalloc = 512;
        var tooLongPath = new string('s', minLengthToUseBufferInsteadOfStackalloc);

        var generatedSkjema = CreateTestSkjema();
        IFormDataWrapper generatedWrapper =
            new Altinn_App_SourceGenerator_Integration_Tests_Models_SkjemaFormDataWrapper(generatedSkjema);
        var generatedResult = generatedWrapper.Set(tooLongPath, "value", [1, 3, 4]);

        var reflectionSkjema = CreateTestSkjema();
        IFormDataWrapper reflectionWrapper = new ReflectionFormDataWrapper(reflectionSkjema);
        var reflectionResult = reflectionWrapper.Set(tooLongPath, "value", [1, 3, 4]);

        // Both should fail for non-existent long path
        Assert.False(generatedResult);
        Assert.False(reflectionResult);
    }

    [Fact]
    public void TestSet_ComplexScenario_BothImplementations()
    {
        // Test a complex scenario with multiple sets
        var generatedSkjema = CreateTestSkjema();
        IFormDataWrapper generatedWrapper =
            new Altinn_App_SourceGenerator_Integration_Tests_Models_SkjemaFormDataWrapper(generatedSkjema);

        var reflectionSkjema = CreateTestSkjema();
        IFormDataWrapper reflectionWrapper = new ReflectionFormDataWrapper(reflectionSkjema);

        // Perform multiple sets
        var operations = new (string path, object value)[]
        {
            ("skjemanummer", "updated-number"),
            ("skjemainnhold[0].alder", 100),
            ("skjemainnhold[1].adresse.gate", "completely-new-street"),
            ("skjemainnhold[1].tidligere-adresse[0].postnummer", 1111),
            ("eierAdresse.gate", "new-owner-address"),
        };

        foreach (var (path, value) in operations)
        {
            var generatedResult = generatedWrapper.Set(path, ExpressionValue.FromObject(value));
            var reflectionResult = reflectionWrapper.Set(path, ExpressionValue.FromObject(value));

            Assert.Equal(generatedResult, reflectionResult);
            Assert.True(generatedResult, $"Set operation failed for path: {path}");

            var generatedActual = generatedWrapper.Get(path);
            var reflectionActual = reflectionWrapper.Get(path);

            Assert.Equal(generatedActual, reflectionActual);
            Assert.Equal(value, generatedActual);
        }

        // Verify all values are still set correctly
        foreach (var (path, value) in operations)
        {
            var generatedActual = generatedWrapper.Get(path);
            var reflectionActual = reflectionWrapper.Get(path);

            Assert.Equal(generatedActual, reflectionActual);
            Assert.Equal(value, generatedActual);
        }
    }

    [Fact]
    public void TestSet_CreatesIntermediateObjects_BothImplementations()
    {
        // Test that Set creates intermediate objects when they are null
        var generatedSkjema = new Skjema { Skjemanummer = "123", EierAdresse = null };
        IFormDataWrapper generatedWrapper =
            new Altinn_App_SourceGenerator_Integration_Tests_Models_SkjemaFormDataWrapper(generatedSkjema);

        var reflectionSkjema = new Skjema { Skjemanummer = "123", EierAdresse = null };
        IFormDataWrapper reflectionWrapper = new ReflectionFormDataWrapper(reflectionSkjema);

        // Try to set a nested property on a null object
        var generatedResult = generatedWrapper.Set("eierAdresse.gate", "new-street");
        var reflectionResult = reflectionWrapper.Set("eierAdresse.gate", "new-street");

        // Both should succeed
        Assert.Equal(generatedResult, reflectionResult);
        Assert.True(generatedResult);

        // Both should have created the intermediate object
        Assert.NotNull(generatedSkjema.EierAdresse);
        Assert.NotNull(reflectionSkjema.EierAdresse);
        Assert.Equal("new-street", generatedSkjema.EierAdresse.Gate);
        Assert.Equal("new-street", reflectionSkjema.EierAdresse.Gate);
    }

    [Fact]
    public void TestSet_OnEmptyModel_BothImplementations()
    {
        var model = new Empty();
        IFormDataWrapper generatedWrapper =
            new Altinn_App_SourceGenerator_Integration_Tests_Models_EmptyFormDataWrapper(model);
        IFormDataWrapper reflectionWrapper = new ReflectionFormDataWrapper(model);

        var generatedResult = generatedWrapper.Set("someProperty", "value");
        var reflectionResult = reflectionWrapper.Set("someProperty", "value");
        // Both should fail as there are no properties to set
        Assert.False(generatedResult);
        Assert.False(reflectionResult);
    }

    [Theory]
    [InlineData("skjemainnhold[0].alder", int.MaxValue)]
    [InlineData("skjemainnhold[0].alder", int.MinValue)]
    [InlineData("skjemainnhold[1].adresse.postnummer", 0)]
    [InlineData("skjemainnhold[0].deltar", true)]
    [InlineData("skjemainnhold[0].deltar", false)]
    public void TestSet_EdgeCaseValues_BothImplementations(string path, object value)
    {
        var generatedSkjema = CreateTestSkjema();
        IFormDataWrapper generatedWrapper =
            new Altinn_App_SourceGenerator_Integration_Tests_Models_SkjemaFormDataWrapper(generatedSkjema);
        var generatedResult = generatedWrapper.Set(path, ExpressionValue.FromObject(value));

        var reflectionSkjema = CreateTestSkjema();
        IFormDataWrapper reflectionWrapper = new ReflectionFormDataWrapper(reflectionSkjema);
        var reflectionResult = reflectionWrapper.Set(path, ExpressionValue.FromObject(value));

        // Both should succeed
        Assert.Equal(generatedResult, reflectionResult);
        Assert.True(generatedResult);

        // Verify both produce the same result
        var generatedActual = generatedWrapper.Get(path);
        var reflectionActual = reflectionWrapper.Get(path);
        Assert.Equal(generatedActual, reflectionActual);
        Assert.Equal(value, generatedActual);
    }
}

using System.Collections;
using System.Text.Json;
using System.Text.Json.Nodes;
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
            new Altinn_App_SourceGenerator_Integration_Tests_Models_SkjemaFormDataWrapper(generatedSkjema, null!);
        var generatedResult = generatedWrapper.Set(path, ExpressionValue.FromObject(value));
        Assert.True(generatedResult, $"Source-generated Set failed for path: {path}");
        var generatedActual = generatedWrapper.Get(path);

        // Test reflection implementation
        var reflectionSkjema = CreateTestSkjema();
        IFormDataWrapper reflectionWrapper = new ReflectionFormDataWrapper(reflectionSkjema, null!);
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
    [InlineData("eierAdresse", """{"gate":"new-street","postnummer":1234,"poststed":null}""")]
    [InlineData("skjemainnhold[1].adresse", """{"gate":"new-street","postnummer":1234,"poststed":"by"}""")]
    [InlineData("skjemainnhold[1].tidligere-adresse", """[{"gate":"a","postnummer":1,"poststed":null}]""")]
    [InlineData("skjemainnhold[1].tidligere-adresse[1]", """{"gate":"b","postnummer":2,"poststed":null}""")]
    [InlineData("skjemainnhold[1].withListOfInt", "[1,2,3]")]
    public void TestSet_WholeListsAndObjects_BothImplementations(string path, string json)
    {
        var generatedSkjema = CreateTestSkjema();
        IFormDataWrapper generatedWrapper =
            new Altinn_App_SourceGenerator_Integration_Tests_Models_SkjemaFormDataWrapper(generatedSkjema, null!);
        Assert.True(generatedWrapper.Set(path, JsonNode.Parse(json)!), $"Source-generated Set failed for path: {path}");

        var reflectionSkjema = CreateTestSkjema();
        IFormDataWrapper reflectionWrapper = new ReflectionFormDataWrapper(reflectionSkjema, null!);
        Assert.True(reflectionWrapper.Set(path, JsonNode.Parse(json)!), $"Reflection Set failed for path: {path}");

        Assert.Equal(json, JsonSerializer.Serialize(generatedWrapper.Get(path)));
        Assert.Equal(JsonSerializer.Serialize(reflectionSkjema), JsonSerializer.Serialize(generatedSkjema));
    }

    [Theory]
    [InlineData("eierAdresse")] // nullable object
    [InlineData("skjemainnhold[1].tidligere-adresse")] // nullable list
    [InlineData("skjemainnhold[1].withListOfString")] // nullable-oblivious list
    [InlineData("skjemainnhold[0]")] // nullable list element
    [InlineData("skjemainnhold[1].tidligere-adresse[0]")] // non-nullable object element
    [InlineData("skjemainnhold[1].tidligere-adresse[1].tags[0]")] // non-nullable string element
    public void TestSet_NullIntoListsAndObjects_BothImplementations(string path)
    {
        var generatedSkjema = CreateTestSkjema();
        IFormDataWrapper generatedWrapper =
            new Altinn_App_SourceGenerator_Integration_Tests_Models_SkjemaFormDataWrapper(generatedSkjema, null!);
        Assert.True(generatedWrapper.Set(path, ExpressionValue.Null), $"Source-generated Set failed for path: {path}");
        Assert.Null(generatedWrapper.Get(path));

        var reflectionSkjema = CreateTestSkjema();
        IFormDataWrapper reflectionWrapper = new ReflectionFormDataWrapper(reflectionSkjema, null!);
        Assert.True(reflectionWrapper.Set(path, ExpressionValue.Null), $"Reflection Set failed for path: {path}");
        Assert.Null(reflectionWrapper.Get(path));

        Assert.Equal(JsonSerializer.Serialize(reflectionSkjema), JsonSerializer.Serialize(generatedSkjema));
    }

    [Fact]
    public void TestSet_NullIntoValueTypeElement_BothImplementations()
    {
        var generatedSkjema = CreateTestSkjema();
        IFormDataWrapper generatedWrapper =
            new Altinn_App_SourceGenerator_Integration_Tests_Models_SkjemaFormDataWrapper(generatedSkjema, null!);
        var reflectionSkjema = CreateTestSkjema();
        IFormDataWrapper reflectionWrapper = new ReflectionFormDataWrapper(reflectionSkjema, null!);

        foreach (var wrapper in new[] { generatedWrapper, reflectionWrapper })
        {
            Assert.True(wrapper.Set("skjemainnhold[1].withListOfInt", JsonNode.Parse("[1,2]")!));
            Assert.False(wrapper.Set("skjemainnhold[1].withListOfInt[0]", ExpressionValue.Null));
            Assert.Equal(1, wrapper.Get("skjemainnhold[1].withListOfInt[0]"));
        }
        Assert.Equal(JsonSerializer.Serialize(reflectionSkjema), JsonSerializer.Serialize(generatedSkjema));
    }

    [Theory]
    [InlineData("skjemainnhold", """{"navn":"appended"}""", 4)]
    [InlineData("skjemainnhold", "null", 4)] // nullable row
    [InlineData("skjemainnhold[1].tidligere-adresse", """{"gate":"appended"}""", 3)]
    [InlineData("skjemainnhold[1].tidligere-adresse", "null", 3)] // null is added, as Set accepts it for reference types
    [InlineData("skjemainnhold[1].tidligere-adresse[1].tags", "\"tag3\"", 3)]
    [InlineData("skjemainnhold[0].tidligere-adresse", """{"gate":"first"}""", 1)] // null list is created
    [InlineData("skjemainnhold[1].withListOfInt", "4", 1)] // null nullable-oblivious list is created
    [InlineData("skjemainnhold[1].withListOfInt", "\"5\"", 1)] // converted like Set converts
    public void TestAddRow_BothImplementations(string path, string json, int expectedCount)
    {
        var rowPath = $"{path}[{expectedCount - 1}]";
        var value = ExpressionValue.FromJsonString(json);

        var generatedSkjema = CreateTestSkjema();
        IFormDataWrapper generatedWrapper =
            new Altinn_App_SourceGenerator_Integration_Tests_Models_SkjemaFormDataWrapper(generatedSkjema, null!);
        Assert.True(generatedWrapper.AddRow(path, value), $"Source-generated AddRow failed for path: {path}");
        Assert.Equal(expectedCount, Assert.IsAssignableFrom<ICollection>(generatedWrapper.Get(path)).Count);

        var reflectionSkjema = CreateTestSkjema();
        IFormDataWrapper reflectionWrapper = new ReflectionFormDataWrapper(reflectionSkjema, null!);
        Assert.True(reflectionWrapper.AddRow(path, value), $"Reflection AddRow failed for path: {path}");
        Assert.Equal(expectedCount, Assert.IsAssignableFrom<ICollection>(reflectionWrapper.Get(path)).Count);

        Assert.Equal(
            JsonSerializer.Serialize(reflectionWrapper.Get(rowPath)),
            JsonSerializer.Serialize(generatedWrapper.Get(rowPath))
        );
        Assert.Equal(JsonSerializer.Serialize(reflectionSkjema), JsonSerializer.Serialize(generatedSkjema));
    }

    [Theory]
    [InlineData("", "{}")] // empty path
    [InlineData("not-exists", "{}")] // non-existent path
    [InlineData("skjemanummer", "\"x\"")] // a string, not a list
    [InlineData("eierAdresse", "{}")] // an object, not a list
    [InlineData("skjemainnhold[0]", "{}")] // a row, not a list
    [InlineData("skjemainnhold[0].navn", "\"x\"")] // a property of a row, not a list
    [InlineData("skjemainnhold[99].tidligere-adresse", "{}")] // out of bounds index on the way
    [InlineData("skjemainnhold[2].tidligere-adresse", "{}")] // null item on the way
    [InlineData("skjemainnhold[1].withCollection", "{}")] // not an indexable list
    [InlineData("skjemainnhold[1].tidligere-adresse", "\"text\"")] // wrong kind of value
    [InlineData("skjemainnhold[1].withListOfInt", "null")] // null into a value type
    [InlineData("skjemainnhold[1].withListOfInt", "\"text\"")] // wrong kind of value
    public void TestAddRow_InvalidPathsAndValues_BothImplementations(string path, string json)
    {
        var value = ExpressionValue.FromJsonString(json);

        var generatedSkjema = CreateTestSkjema();
        IFormDataWrapper generatedWrapper =
            new Altinn_App_SourceGenerator_Integration_Tests_Models_SkjemaFormDataWrapper(generatedSkjema, null!);
        Assert.False(generatedWrapper.AddRow(path, value), $"Source-generated AddRow succeeded for path: {path}");

        var reflectionSkjema = CreateTestSkjema();
        IFormDataWrapper reflectionWrapper = new ReflectionFormDataWrapper(reflectionSkjema, null!);
        Assert.False(reflectionWrapper.AddRow(path, value), $"Reflection AddRow succeeded for path: {path}");

        Assert.Equal(JsonSerializer.Serialize(reflectionSkjema), JsonSerializer.Serialize(generatedSkjema));
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
            new Altinn_App_SourceGenerator_Integration_Tests_Models_SkjemaFormDataWrapper(generatedSkjema, null!);
        var generatedResult = generatedWrapper.Set(path, ExpressionValue.FromObject(value));

        // Test reflection implementation
        var reflectionSkjema = CreateTestSkjema();
        IFormDataWrapper reflectionWrapper = new ReflectionFormDataWrapper(reflectionSkjema, null!);
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
            new Altinn_App_SourceGenerator_Integration_Tests_Models_SkjemaFormDataWrapper(generatedSkjema, null!);
        var generatedResult = generatedWrapper.Set(path, ExpressionValue.FromObject(value));

        // Test reflection implementation
        var reflectionSkjema = CreateTestSkjema();
        IFormDataWrapper reflectionWrapper = new ReflectionFormDataWrapper(reflectionSkjema, null!);
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
    [InlineData("skjemainnhold[3]")] // index after the last row - use AddRow to append
    [InlineData("skjemainnhold[3].navn")]
    [InlineData("skjemainnhold[0].not-exists")] // non-existent property
    [InlineData("skjemainnhold[1].adresse.not-exists")] // non-existent nested property
    [InlineData("skjemainnhold[2].navn")] // null item in list (Might reconsider this test case)
    public void TestSet_InvalidPaths_BothImplementations(string path)
    {
        // Test source-generated implementation
        var generatedSkjema = CreateTestSkjema();
        IFormDataWrapper generatedWrapper =
            new Altinn_App_SourceGenerator_Integration_Tests_Models_SkjemaFormDataWrapper(generatedSkjema, null!);
        var generatedResult = generatedWrapper.Set(path, "test-value");

        // Test reflection implementation
        var reflectionSkjema = CreateTestSkjema();
        IFormDataWrapper reflectionWrapper = new ReflectionFormDataWrapper(reflectionSkjema, null!);
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
            new Altinn_App_SourceGenerator_Integration_Tests_Models_SkjemaFormDataWrapper(generatedSkjema, null!);
        Assert.Throws<DataModelException>(() => generatedWrapper.Set("skjemainnhold[-1].navn", "value"));

        var reflectionSkjema = CreateTestSkjema();
        IFormDataWrapper reflectionWrapper = new ReflectionFormDataWrapper(reflectionSkjema, null!);
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
            new Altinn_App_SourceGenerator_Integration_Tests_Models_SkjemaFormDataWrapper(generatedSkjema, null!);
        var generatedResult = generatedWrapper.Set(tooLongPath, "value", [1, 3, 4]);

        var reflectionSkjema = CreateTestSkjema();
        IFormDataWrapper reflectionWrapper = new ReflectionFormDataWrapper(reflectionSkjema, null!);
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
            new Altinn_App_SourceGenerator_Integration_Tests_Models_SkjemaFormDataWrapper(generatedSkjema, null!);

        var reflectionSkjema = CreateTestSkjema();
        IFormDataWrapper reflectionWrapper = new ReflectionFormDataWrapper(reflectionSkjema, null!);

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
            new Altinn_App_SourceGenerator_Integration_Tests_Models_SkjemaFormDataWrapper(generatedSkjema, null!);

        var reflectionSkjema = new Skjema { Skjemanummer = "123", EierAdresse = null };
        IFormDataWrapper reflectionWrapper = new ReflectionFormDataWrapper(reflectionSkjema, null!);

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
            new Altinn_App_SourceGenerator_Integration_Tests_Models_EmptyFormDataWrapper(model, null!);
        IFormDataWrapper reflectionWrapper = new ReflectionFormDataWrapper(model, null!);

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
            new Altinn_App_SourceGenerator_Integration_Tests_Models_SkjemaFormDataWrapper(generatedSkjema, null!);
        var generatedResult = generatedWrapper.Set(path, ExpressionValue.FromObject(value));

        var reflectionSkjema = CreateTestSkjema();
        IFormDataWrapper reflectionWrapper = new ReflectionFormDataWrapper(reflectionSkjema, null!);
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

using System.Collections.Generic;
using Altinn.App.Core.Helpers.DataModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Models.Layout;
using Altinn.App.SourceGenerator.Integration.Tests.Models;
using Altinn.Platform.Storage.Interface.Models;
using Xunit;

namespace Altinn.App.SourceGenerator.Integration.Tests.UnitTest;

public class TestGetResolvedKeys()
{
    private readonly DataElement _dataElement = new()
    {
        Id = "00000000-0000-0000-0000-000000000000",
        DataType = "model",
    };
    private readonly DataType _dataType = new() { Id = "model" };

    /// <summary>
    /// Create a shared instance of Skjema for testing.
    /// </summary>
    private readonly Skjema _skjema = new Skjema()
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
        ],
        EierAdresse = null,
    };

    [Theory]
    [InlineData("skjemanummer", new[] { "skjemanummer" })]
    [InlineData("skjemainnhold.navn", new[] { "skjemainnhold[0].navn", "skjemainnhold[1].navn" })]
    [InlineData("skjemainnhold.alder", new[] { "skjemainnhold[0].alder", "skjemainnhold[1].alder" })]
    [InlineData("skjemainnhold[0].alder", new[] { "skjemainnhold[0].alder" })]
    [InlineData("skjemainnhold[1].alder", new[] { "skjemainnhold[1].alder" })]
    [InlineData("skjemainnhold.deltar", new[] { "skjemainnhold[0].deltar", "skjemainnhold[1].deltar" })]
    [InlineData("skjemainnhold.adresse", new[] { "skjemainnhold[0].adresse", "skjemainnhold[1].adresse" })]
    [InlineData(
        "skjemainnhold.adresse.gate",
        new[] { "skjemainnhold[0].adresse.gate", "skjemainnhold[1].adresse.gate" }
    )]
    [InlineData(
        "skjemainnhold.adresse.postnummer",
        new[] { "skjemainnhold[0].adresse.postnummer", "skjemainnhold[1].adresse.postnummer" }
    )]
    [InlineData(
        "skjemainnhold.tidligere-adresse.gate",
        new[] { "skjemainnhold[1].tidligere-adresse[0].gate", "skjemainnhold[1].tidligere-adresse[1].gate" }
    )]
    [InlineData("skjemainnhold[0].tidligere-adresse.gate", new string[] { })]
    [InlineData(
        "skjemainnhold.tidligere-adresse.postnummer",
        new[] { "skjemainnhold[1].tidligere-adresse[0].postnummer", "skjemainnhold[1].tidligere-adresse[1].postnummer" }
    )]
    [InlineData("eierAdresse", new[] { "eierAdresse" })]
    [InlineData("eierAdresse.gate", new[] { "eierAdresse.gate" })]
    [InlineData("doesnotexist", new string[] { })]
    [InlineData("skjemainnhold.doesnotexist", new string[] { })]
    // An unindexed collection as the last part of the path refers to the collection itself,
    // so it resolves to the (indexed) collection key without enumerating its rows. The
    // collection reference is returned even when the collection is null (cf. skjemainnhold[0]).
    [InlineData("skjemainnhold", new string[] { "skjemainnhold" })]
    [InlineData(
        "skjemainnhold.tidligere-adresse",
        new string[] { "skjemainnhold[0].tidligere-adresse", "skjemainnhold[1].tidligere-adresse" }
    )]
    [InlineData(
        "skjemainnhold.tidligere-adresse.tags",
        new string[] { "skjemainnhold[1].tidligere-adresse[0].tags", "skjemainnhold[1].tidligere-adresse[1].tags" }
    )]
    // An explicit index refers to a single row, which is resolved as usual.
    [InlineData(
        // skjemainnhold[0].tidligere-adresse is null, so the index does not resolve
        "skjemainnhold.tidligere-adresse[1]",
        new string[] { "skjemainnhold[1].tidligere-adresse[1]" }
    )]
    [InlineData("skjemainnhold[0]", new string[] { "skjemainnhold[0]" })]
    // "group[]" enumerates every row of the collection at the end of the path.
    [InlineData("skjemainnhold[]", new[] { "skjemainnhold[0]", "skjemainnhold[1]" })]
    // "[]" in the middle of the path is equivalent to a bare collection (both expand over rows).
    [InlineData("skjemainnhold[].navn", new[] { "skjemainnhold[0].navn", "skjemainnhold[1].navn" })]
    [InlineData(
        // skjemainnhold[0].tidligere-adresse is null, so it contributes no rows
        "skjemainnhold.tidligere-adresse[]",
        new[] { "skjemainnhold[1].tidligere-adresse[0]", "skjemainnhold[1].tidligere-adresse[1]" }
    )]
    [InlineData(
        "skjemainnhold[1].tidligere-adresse[]",
        new[] { "skjemainnhold[1].tidligere-adresse[0]", "skjemainnhold[1].tidligere-adresse[1]" }
    )]
    [InlineData(
        // tidligere-adresse[0].tags is null, so only tidligere-adresse[1].tags contributes rows
        "skjemainnhold[].tidligere-adresse[].tags[]",
        new[] { "skjemainnhold[1].tidligere-adresse[1].tags[0]", "skjemainnhold[1].tidligere-adresse[1].tags[1]" }
    )]
    public void TestResolvedKeys(string field, string[] expectedKeys)
    {
        // Test old reflection based implementation
        var modelWrapper = new DataModelWrapper(_skjema);
        var resolvedKeysReflection = modelWrapper.GetResolvedKeys(field);
        Assert.Equal(expectedKeys, resolvedKeysReflection);

        // Test formDataWrapper
        var dataWrapper = FormDataWrapperFactory.Create(_skjema, _dataType, _dataElement);
        var resolvedKeys = dataWrapper.GetResolvedKeys(field);
        Assert.Equal(expectedKeys, resolvedKeys);
    }

    /// <summary>
    /// A null collection and an empty collection must resolve identically - the result must
    /// depend only on the path, not on whether the (empty) collection was instantiated.
    ///
    /// A bare collection at the end of the path resolves to the collection itself (so the key
    /// is returned regardless of contents), while descending through or indexing into an
    /// empty/null collection finds no rows and resolves to nothing.
    /// </summary>
    [Theory]
    // Top level collection (Skjemainnhold)
    [InlineData("skjemainnhold", new[] { "skjemainnhold" })]
    [InlineData("skjemainnhold[]", new string[] { })]
    [InlineData("skjemainnhold.navn", new string[] { })]
    [InlineData("skjemainnhold[0].navn", new string[] { })]
    public void NullAndEmptyTopLevelCollection_ResolveTheSame(string field, string[] expectedKeys)
    {
        AssertResolvedKeys(new Skjema() { Skjemainnhold = null }, field, expectedKeys);
        AssertResolvedKeys(new Skjema() { Skjemainnhold = [] }, field, expectedKeys);
    }

    /// <summary>
    /// Same as <see cref="NullAndEmptyTopLevelCollection_ResolveTheSame"/>, but for a nested
    /// collection (TidligereAdresse) inside a populated parent row.
    /// </summary>
    [Theory]
    [InlineData("skjemainnhold[0].tidligere-adresse", new[] { "skjemainnhold[0].tidligere-adresse" })]
    [InlineData("skjemainnhold[0].tidligere-adresse[]", new string[] { })]
    [InlineData("skjemainnhold[0].tidligere-adresse.gate", new string[] { })]
    [InlineData("skjemainnhold[0].tidligere-adresse[1].gate", new string[] { })]
    public void NullAndEmptyNestedCollection_ResolveTheSame(string field, string[] expectedKeys)
    {
        AssertResolvedKeys(BuildNested(null), field, expectedKeys);
        AssertResolvedKeys(BuildNested([]), field, expectedKeys);

        static Skjema BuildNested(List<Adresse>? tidligereAdresse) =>
            new() { Skjemainnhold = [new SkjemaInnhold() { Navn = "navn", TidligereAdresse = tidligereAdresse }] };
    }

    private void AssertResolvedKeys(Skjema skjema, string field, string[] expectedKeys)
    {
        // Test old reflection based implementation
        var modelWrapper = new DataModelWrapper(skjema);
        Assert.Equal(expectedKeys, modelWrapper.GetResolvedKeys(field));

        // Test formDataWrapper
        var dataWrapper = FormDataWrapperFactory.Create(skjema, _dataType, _dataElement);
        Assert.Equal(expectedKeys, dataWrapper.GetResolvedKeys(field));
    }
}

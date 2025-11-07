using System;
using System.Collections.Generic;
using Altinn.App.Core.Helpers.DataModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.SourceGenerator.Integration.Tests.Models;
using Xunit;
using Xunit.Abstractions;

namespace Altinn.App.SourceGenerator.Integration.Tests.UnitTest;

public class TestGeneratedGetter(ITestOutputHelper testOutputHelper)
{
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

    [Fact]
    public void TestGetWithTypeExtensions()
    {
        IFormDataWrapper dataWrapper = new Altinn_App_SourceGenerator_Integration_Tests_Models_SkjemaFormDataWrapper(
            _skjema
        );

        Assert.Equal("1243", dataWrapper.Get<string>("skjemanummer"));

        _skjema.Skjemanummer = null;
        Assert.Null(dataWrapper.Get<string>("skjemanummer"));

        Assert.Throws<ArgumentException>(() => dataWrapper.Get<string>("skjemainnhold[0].alder"));
        Assert.Equal(42, dataWrapper.Get<int>("skjemainnhold[0].alder"));
        Assert.Null(dataWrapper.Get<int?>("skjemainnhold[3].alder"));
        Assert.Equal(0, dataWrapper.Get<int>("skjemainnhold[3].alder"));
    }

    [Fact]
    public void TestGetWithLongPath()
    {
        // Just ensure coverage when path is longer than we want to stackalloc
        IFormDataWrapper dataWrapper = new Altinn_App_SourceGenerator_Integration_Tests_Models_SkjemaFormDataWrapper(
            _skjema
        );
        var minLengthToUseBufferInsteadOfStackalloc = 512;
        var tooLongPath = new string('s', minLengthToUseBufferInsteadOfStackalloc);
        var actual = dataWrapper.Get(tooLongPath, [1, 3, 4]);
        Assert.Null(actual);
    }

    [Theory]
    [InlineData("skjemanummer", "1243")]
    [InlineData("skjemaversjon", "x4")]
    [InlineData("skjemainnhold[0].altinnRowId", "00000000-0000-0000-0000-000000000000")]
    [InlineData("skjemainnhold[0].navn", "navn")]
    [InlineData("skjemainnhold[0].alder", 42)]
    [InlineData("skjemainnhold[0].deltar", true)]
    [InlineData("skjemainnhold[1].altinnRowId", "00000000-0000-0000-0000-000000000000")]
    [InlineData("skjemainnhold[1].navn", "navn2")]
    [InlineData("skjemainnhold[1].alder", 43)]
    [InlineData("skjemainnhold[1].deltar", false)]
    [InlineData("skjemainnhold[1].adresse.gate", "gate")]
    [InlineData("skjemainnhold[1].adresse.postnummer", 1234)]
    [InlineData("skjemainnhold[1].tidligere-adresse[1].postnummer", 1236)]
    [InlineData("skjemainnhold[1].tidligere-adresse[1].tags[0]", "tag1")]
    [InlineData("skjemainnhold[1].tidligere-adresse[1].tags[99000]", null)]
    public void TestGetRaw(string path, object? expected)
    {
        IFormDataWrapper dataWrapper = new Altinn_App_SourceGenerator_Integration_Tests_Models_SkjemaFormDataWrapper(
            _skjema
        );
        var actual = dataWrapper.Get(path);
        if (actual is Guid guid && expected is string stringGuid)
        {
            Assert.Equal(Guid.Parse(stringGuid), guid);
        }
        else
        {
            Assert.Equal(expected, actual);
        }

        var reflector = new ReflectionFormDataWrapper(_skjema);
        var reflectorActual = reflector.Get(path);
        if (reflectorActual is Guid rGuid && expected is string rstringGuid)
        {
            Assert.Equal(Guid.Parse(rstringGuid), rGuid);
        }
        else
        {
            Assert.Equal(expected, reflectorActual);
        }
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("skjemanummer.not-exists")]
    [InlineData("skjemanummer[4].not-exists")]
    [InlineData("not-exists")]
    [InlineData("skjemainnhold[2]")]
    [InlineData("skjemainnhold[4]")]
    [InlineData("skjemainnhold[2].navn")]
    [InlineData("skjemainnhold[0].not-exists")]
    [InlineData("skjemainnhold[0].navn.not-exists")]
    [InlineData("skjemainnhold[1].tidligere-adresse[99].postnummer")]
    [InlineData("skjemainnhold[0].adresse.gate")]
    [InlineData("skjemainnhold[1].adresse.")]
    [InlineData("skjemainnhold[1].adresse[0]")]
    [InlineData("skjemainnhold[1].")]
    public void TestGetRawErrorReturnNull(string? path)
    {
        // These might all throw exceptions when we have better validation of data model bindings at startup
        IFormDataWrapper dataWrapper = new Altinn_App_SourceGenerator_Integration_Tests_Models_SkjemaFormDataWrapper(
            _skjema
        );
        Assert.Null(dataWrapper.Get(path));

        var reflector = new ReflectionFormDataWrapper(_skjema);
        Assert.Null(reflector.Get(path));
    }

    [Theory]
    [InlineData("skjemainnhold[-1]")]
    [InlineData("skjemainnhold[a]")]
    [InlineData("skjemainnhold[1].tidligere-adresse[-1]")]
    [InlineData("skjemainnhold[1]tidligere-adresse[-1]")]
    public void TestGetRawErrorReturnException(string? path)
    {
        // These might all throw exceptions when we have better validation of data model bindings at startup
        IFormDataWrapper dataWrapper = new Altinn_App_SourceGenerator_Integration_Tests_Models_SkjemaFormDataWrapper(
            _skjema
        );
        testOutputHelper.WriteLine(Assert.Throws<DataModelException>(() => dataWrapper.Get(path)).ToString());

        var reflector = new ReflectionFormDataWrapper(_skjema);
        testOutputHelper.WriteLine(Assert.Throws<DataModelException>(() => reflector.Get(path)).ToString());
    }

    [Fact]
    public void TestGetListRaw()
    {
        var path = "skjemainnhold[1].tidligere-adresse[1].tags";
        var expected = _skjema.Skjemainnhold?[1]?.TidligereAdresse?[1]?.Tags;
        Assert.NotNull(expected);
        IFormDataWrapper dataWrapper = new Altinn_App_SourceGenerator_Integration_Tests_Models_SkjemaFormDataWrapper(
            _skjema
        );
        Assert.Equivalent(expected, dataWrapper.Get(path));

        var reflector = new ReflectionFormDataWrapper(_skjema);
        Assert.Equivalent(expected, reflector.Get(path));
    }

    [Fact]
    public void GetObjectRaw()
    {
        var path = "skjemainnhold[1].adresse";
        var expected = _skjema.Skjemainnhold?[1]?.Adresse;
        Assert.NotNull(expected);
        IFormDataWrapper dataWrapper = new Altinn_App_SourceGenerator_Integration_Tests_Models_SkjemaFormDataWrapper(
            _skjema
        );
        Assert.Equal(expected, dataWrapper.Get(path));

        var reflector = new ReflectionFormDataWrapper(_skjema);
        Assert.Equal(expected, reflector.Get(path));
    }

    [Fact]
    public void TestPathHelper()
    {
        var path = "skjemainnhold.navn";
        var segment = Altinn_App_SourceGenerator_Integration_Tests_Models_SkjemaFormDataWrapper.ParseSegment(
            path,
            0,
            out int nextOffset,
            out int literalIndex
        );
        Assert.Equal("skjemainnhold", segment);
        Assert.Equal(14, nextOffset);
        Assert.Equal(-1, literalIndex);
        segment = Altinn_App_SourceGenerator_Integration_Tests_Models_SkjemaFormDataWrapper.ParseSegment(
            path,
            nextOffset,
            out nextOffset,
            out literalIndex
        );
        Assert.Equal("navn", segment);
        Assert.Equal(-1, nextOffset);
        Assert.Equal(-1, literalIndex);
        testOutputHelper.WriteLine(
            Assert
                .Throws<ArgumentOutOfRangeException>(() =>
                    Altinn_App_SourceGenerator_Integration_Tests_Models_SkjemaFormDataWrapper.ParseSegment(
                        path,
                        nextOffset,
                        out nextOffset,
                        out literalIndex
                    )
                )
                .ToString()
        );
    }

    [Fact]
    public void TestAltinn_App_SourceGenerator_Integration_Tests_Models_SkjemaFormDataWrapperRecursive()
    {
        var path = "a.b[3].c";
        var segment = Altinn_App_SourceGenerator_Integration_Tests_Models_SkjemaFormDataWrapper.ParseSegment(
            path,
            0,
            out int nextOffset,
            out int literalIndex
        );
        Assert.Equal("a", segment);
        Assert.Equal(2, nextOffset);
        Assert.Equal(-1, literalIndex);
        segment = Altinn_App_SourceGenerator_Integration_Tests_Models_SkjemaFormDataWrapper.ParseSegment(
            path,
            nextOffset,
            out nextOffset,
            out literalIndex
        );
        Assert.Equal("b", segment);
        Assert.Equal(7, nextOffset);
        Assert.Equal(3, literalIndex);

        segment = Altinn_App_SourceGenerator_Integration_Tests_Models_SkjemaFormDataWrapper.ParseSegment(
            path,
            nextOffset,
            out nextOffset,
            out literalIndex
        );
        Assert.Equal("c", segment);
        Assert.Equal(-1, nextOffset);
        Assert.Equal(-1, literalIndex);

        Assert.Throws<ArgumentOutOfRangeException>(() =>
            Altinn_App_SourceGenerator_Integration_Tests_Models_SkjemaFormDataWrapper.ParseSegment(
                path,
                nextOffset,
                out nextOffset,
                out literalIndex
            )
        );
    }

    [Fact]
    public void TestParseSegment_HyphenWithIndex()
    {
        var path = "tidligere-adresse[1]";
        var segment = Altinn_App_SourceGenerator_Integration_Tests_Models_SkjemaFormDataWrapper.ParseSegment(
            path,
            0,
            out int nextOffset,
            out int literalIndex
        );
        Assert.Equal("tidligere-adresse", segment);
        Assert.Equal(-1, nextOffset);
        Assert.Equal(1, literalIndex);
    }

    [Fact]
    public void TestParseSegment_MultiDigitIndex()
    {
        var path = "x[12344567]";
        var segment = Altinn_App_SourceGenerator_Integration_Tests_Models_SkjemaFormDataWrapper.ParseSegment(
            path,
            0,
            out int nextOffset,
            out int literalIndex
        );
        Assert.Equal("x", segment);
        Assert.Equal(-1, nextOffset);
        Assert.Equal(12344567, literalIndex);
    }
}

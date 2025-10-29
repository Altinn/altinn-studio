using System;
using Altinn.App.Core.Internal.Data;
using Altinn.App.SourceGenerator.Integration.Tests.Models;
using Xunit;

namespace Altinn.App.SourceGenerator.Integration.Tests.UnitTest;

public class TestGeneratedCopy
{
    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void CopyCreatesNewObject(bool reflection)
    {
        var rowIdOla = Guid.NewGuid();
        var rowIdKari = Guid.NewGuid();
        var data = new Skjema()
        {
            Skjemanummer = "123",
            Skjemaversjon = "1",
            Skjemainnhold =
            [
                new()
                {
                    AltinnRowId = rowIdOla,
                    Navn = "Ola",
                    Alder = 30,
                    Deltar = true,
                    Adresse = new()
                    {
                        Gate = "Gata",
                        Postnummer = 1245,
                        Poststed = "Sted",
                    },
                },
                new()
                {
                    AltinnRowId = rowIdKari,
                    Navn = "Kari",
                    Alder = 25,
                    Deltar = false,
                    Adresse = new()
                    {
                        Gate = "Gata",
                        Postnummer = null,
                        Poststed = "Sted",
                    },
                    TidligereAdresse =
                    [
                        new()
                        {
                            Gate = "TidligereGata",
                            Postnummer = 1234,
                            Poststed = "TidligereSted",
                        },
                        new()
                        {
                            Gate = "TidligereGata2",
                            Postnummer = 1235,
                            Poststed = "TidligereSted2",
                            Tags = ["Tag1", "Tag2"],
                        },
                    ],
                },
            ],
        };

        IFormDataWrapper wrapper = reflection
            ? new ReflectionFormDataWrapper(data)
            : new Altinn_App_SourceGenerator_Integration_Tests_Models_SkjemaFormDataWrapper(data);

        var copyWrapper = wrapper.Copy();
        var copy = copyWrapper.BackingData<Skjema>();

        Assert.NotSame(data, copy);
        Assert.Equivalent(data, copy);
        //Just to be extra sure
        Assert.Equal(rowIdOla, copy.Skjemainnhold?[0]?.AltinnRowId);
        Assert.Equal(rowIdKari, copy.Skjemainnhold?[1]?.AltinnRowId);
        Assert.Equal(1245, copy.Skjemainnhold?[0]?.Adresse?.Postnummer);
        Assert.Equal(1245, copyWrapper.Get("skjemainnhold[0].adresse.postnummer"));
        Assert.Null(copy.Skjemainnhold?[1]?.Adresse?.Postnummer);
        Assert.Null(copyWrapper.Get("skjemainnhold[1].adresse.postnummer"));
        Assert.Equal("TidligereGata", copy.Skjemainnhold?[1]?.TidligereAdresse?[0]?.Gate);
        Assert.Equal("TidligereGata", copyWrapper.Get("skjemainnhold[1].tidligere-adresse[0].gate"));
        Assert.Equal("TidligereGata2", copy.Skjemainnhold?[1]?.TidligereAdresse?[1]?.Gate);
        // Ensure the Tags list itself is a different instance (not shared)
        Assert.NotNull(data.Skjemainnhold![1]!.TidligereAdresse![1]!.Tags);
        Assert.NotNull(copy.Skjemainnhold![1]!.TidligereAdresse![1]!.Tags);
        Assert.NotSame(
            data.Skjemainnhold![1]!.TidligereAdresse![1]!.Tags,
            copy.Skjemainnhold![1]!.TidligereAdresse![1]!.Tags
        );

        // Modifications to the copy should not affect the original

        Assert.Equal("1", data.Skjemaversjon);
        copy.Skjemaversjon = "Changed";
        Assert.Equal("1", data.Skjemaversjon);

        Assert.Null(data.Skjemainnhold![1]!.Adresse!.Postnummer);
        copy.Skjemainnhold![1]!.Adresse!.Postnummer = 9999;
        Assert.Null(data.Skjemainnhold![1]!.Adresse!.Postnummer);

        Assert.Equal("TidligereGata", data.Skjemainnhold![1]!.TidligereAdresse![0]!.Gate);
        copy.Skjemainnhold![1]!.TidligereAdresse![0]!.Gate = "CHANGED";
        Assert.Equal("TidligereGata", data.Skjemainnhold![1]!.TidligereAdresse![0]!.Gate);

        Assert.Equal("Tag1", data.Skjemainnhold![1]!.TidligereAdresse![1]!.Tags![0]);
        copy.Skjemainnhold![1]!.TidligereAdresse![1]!.Tags![0] = "CHANGED";
        Assert.Equal("Tag1", data.Skjemainnhold![1]!.TidligereAdresse![1]!.Tags![0]);
        // Adding to the copy's list must not affect the original list length
        copy.Skjemainnhold![1]!.TidligereAdresse![1]!.Tags!.Add("NEW");
        Assert.Equal(2, data.Skjemainnhold![1]!.TidligereAdresse![1]!.Tags!.Count);
    }
}

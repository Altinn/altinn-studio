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

        // Modifications to the copy should not affect the original

        copy.Skjemaversjon = "Changed";
        Assert.Equal("1", data.Skjemaversjon);

        copy.Skjemainnhold![1]!.Adresse!.Postnummer = 9999;
        Assert.Null(data.Skjemainnhold![1]!.Adresse!.Postnummer);

        copy.Skjemainnhold![1]!.TidligereAdresse![0]!.Gate = "CHANGED";
        Assert.Equal("TidligereGata", data.Skjemainnhold![1]!.TidligereAdresse![0]!.Gate);
    }
}

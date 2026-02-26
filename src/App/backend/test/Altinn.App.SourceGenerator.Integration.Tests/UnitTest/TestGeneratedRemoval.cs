using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Data;
using Altinn.App.SourceGenerator.Integration.Tests.Models;
using Xunit;

namespace Altinn.App.SourceGenerator.Integration.Tests.UnitTest;

public class TestGeneratedRemoval
{
    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void TestRemove(bool reflection)
    {
        var data = new Skjema()
        {
            Skjemaversjon = "1.0",
            Skjemanummer = "123456",
            Skjemainnhold =
            [
                new()
                {
                    Navn = "Ola",
                    Alder = 30,
                    Deltar = true,
                    Adresse = new()
                    {
                        Gate = "Storgata 1",
                        Postnummer = 1234,
                        Poststed = "Oslo",
                    },
                },
                new()
                {
                    Navn = "Kari",
                    Alder = 25,
                    Deltar = false,
                    Adresse = new()
                    {
                        Gate = "Storgata 2",
                        Postnummer = 5678,
                        Poststed = "Bergen",
                    },
                },
                new()
                {
                    Navn = "Per",
                    Alder = 40,
                    Deltar = true,
                    Adresse = new()
                    {
                        Gate = "Storgata 3",
                        Postnummer = 9101,
                        Poststed = "Stavanger",
                    },
                },
            ],
            EierAdresse = new()
            {
                Gate = "Eierveien 1",
                Postnummer = 1234,
                Poststed = "Oslo",
            },
        };
        IFormDataWrapper wrapper = reflection
            ? new ReflectionFormDataWrapper(data)
            : new Altinn_App_SourceGenerator_Integration_Tests_Models_SkjemaFormDataWrapper(data);
        var copy = wrapper.Copy().BackingData<Skjema>();
        Assert.NotSame(data, copy);
        Assert.Equivalent(data, copy);
        Assert.NotSame(data.Skjemainnhold, copy.Skjemainnhold);

        wrapper.RemoveField("skjemainnhold[0].navn", RowRemovalOption.Ignore);
        Assert.Equal("Ola", copy.Skjemainnhold?[0]?.Navn);
        Assert.Null(data.Skjemainnhold[0]!.Navn);

        Assert.Equal(3, data.Skjemainnhold!.Count);
        wrapper.RemoveField("skjemainnhold[0]", RowRemovalOption.SetToNull);
        Assert.Equal(3, data.Skjemainnhold!.Count);
        Assert.Null(data.Skjemainnhold[0]);
        wrapper.RemoveField("skjemainnhold[1]", RowRemovalOption.DeleteRow);
        Assert.Equal(2, data.Skjemainnhold!.Count);
        Assert.Equal("Per", data.Skjemainnhold?[1]?.Navn);

        wrapper.RemoveField("skjemainnhold", RowRemovalOption.Ignore);
        Assert.Null(data.Skjemainnhold);
    }
}

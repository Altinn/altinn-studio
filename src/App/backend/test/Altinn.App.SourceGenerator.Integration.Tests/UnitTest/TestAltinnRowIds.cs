using System;
using Altinn.App.Core.Internal.Data;
using Altinn.App.SourceGenerator.Integration.Tests.Models;
using Xunit;

namespace Altinn.App.SourceGenerator.Integration.Tests.UnitTest;

public class TestAltinnRowIds
{
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
                TidligereAdresse =
                [
                    new Adresse()
                    {
                        Gate = "Gata",
                        Postnummer = 1245,
                        Poststed = "Sted",
                    },
                    new Adresse()
                    {
                        Gate = "Gata",
                        Postnummer = null,
                        Poststed = "Sted",
                    },
                ],
            },
            new SkjemaInnhold()
            {
                Navn = "navn2",
                Alder = 43,
                Deltar = false,
            },
        ],
    };

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void TestAddAndRemoveAltinnRowId(bool reflection)
    {
        IFormDataWrapper dataWrapper = reflection
            ? new ReflectionFormDataWrapper(_skjema)
            : new Altinn_App_SourceGenerator_Integration_Tests_Models_SkjemaFormDataWrapper(_skjema);

        // Verify that every rowId is empty
        Assert.Equal(Guid.Empty, _skjema.Skjemainnhold?[0]?.AltinnRowId);
        Assert.Equal(Guid.Empty, _skjema.Skjemainnhold?[1]?.AltinnRowId);
        Assert.Equal(Guid.Empty, _skjema.Skjemainnhold?[0]?.TidligereAdresse?[0].AltinnRowId);
        Assert.Equal(Guid.Empty, _skjema.Skjemainnhold?[0]?.TidligereAdresse?[1].AltinnRowId);
        // Initialize and see that they get non empty values
        dataWrapper.InitializeAltinnRowIds();
        Assert.NotEqual(Guid.Empty, _skjema.Skjemainnhold?[0]?.AltinnRowId);
        Assert.NotEqual(Guid.Empty, _skjema.Skjemainnhold?[1]?.AltinnRowId);
        Assert.NotEqual(Guid.Empty, _skjema.Skjemainnhold?[0]?.TidligereAdresse?[0].AltinnRowId);
        Assert.NotEqual(Guid.Empty, _skjema.Skjemainnhold?[0]?.TidligereAdresse?[1].AltinnRowId);
        // And that guids are different
        Assert.NotEqual(
            _skjema.Skjemainnhold?[0]?.TidligereAdresse?[0].AltinnRowId,
            _skjema.Skjemainnhold?[0]?.TidligereAdresse?[1].AltinnRowId
        );
        // Initialize again to ensure that values don't change on multiple initializations
        var generatedRowId = _skjema.Skjemainnhold?[1]?.AltinnRowId;
        dataWrapper.InitializeAltinnRowIds();
        Assert.Equal(generatedRowId, _skjema.Skjemainnhold?[1]?.AltinnRowId);
        // Check that removal works
        dataWrapper.RemoveAltinnRowIds();
        Assert.Equal(Guid.Empty, _skjema.Skjemainnhold?[0]?.AltinnRowId);
        Assert.Equal(Guid.Empty, _skjema.Skjemainnhold?[1]?.AltinnRowId);
        Assert.Equal(Guid.Empty, _skjema.Skjemainnhold?[0]?.TidligereAdresse?[0].AltinnRowId);
        Assert.Equal("navn", _skjema.Skjemainnhold?[0]?.Navn);
        Assert.Equal("navn2", _skjema.Skjemainnhold?[1]?.Navn);
    }
}

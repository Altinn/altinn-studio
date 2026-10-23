using System.Collections.Generic;
using Altinn.App.Core.Internal.Data;
using Altinn.App.SourceGenerator.Integration.Tests.Models;
using Xunit;

namespace Altinn.App.SourceGenerator.Integration.Tests.UnitTest;

public class TestFixedValues
{
    private static Skjema CreateSkjema() =>
        new()
        {
            Skjemanummer = "1243",
            Skjemainnhold =
            [
                new SkjemaInnhold()
                {
                    Navn = "navn",
                    OldXmlValue = new OldXmlValue() { valueNullable = 1 },
                },
                new SkjemaInnhold()
                {
                    Navn = "navn2",
                    OldXmlValue = new OldXmlValue() { valueNullable = 2 },
                },
                null,
                new SkjemaInnhold() { Navn = "navn3" },
            ],
        };

    private static IFormDataWrapper CreateWrapper(Skjema skjema, bool reflection) =>
        reflection
            ? new ReflectionFormDataWrapper(skjema, null!)
            : new Altinn_App_SourceGenerator_Integration_Tests_Models_SkjemaFormDataWrapper(skjema, null!);

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void DefaultValues_HasNoErrors(bool reflection)
    {
        var skjema = CreateSkjema();

        var errors = CreateWrapper(skjema, reflection).RestoreFixedValues();

        Assert.Empty(errors);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void EmptyModel_HasNoErrors(bool reflection)
    {
        var errors = CreateWrapper(new Skjema(), reflection).RestoreFixedValues();

        Assert.Empty(errors);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void ChangedFixedValues_ReportsPathExpectedAndActual_AndRestoresValues(bool reflection)
    {
        var skjema = CreateSkjema();
        skjema.Skjemainnhold![1]!.OldXmlValue!.dataFormatVersion = "1";
        skjema.Skjemainnhold![1]!.OldXmlValue!.fixedInt = 0;
        skjema.Skjemainnhold![0]!.OldXmlValue!.orid = "changed";
        // Properties without [BindNever] are not fixed values
        skjema.Skjemainnhold![0]!
            .OldXmlValue!
            .valueNullable = 42;

        var errors = CreateWrapper(skjema, reflection).RestoreFixedValues();

        Assert.Equal(
            new List<FixedValueError>
            {
                new("skjemainnhold[0].oldXmlValue.orid", "7117", "changed"),
                new("skjemainnhold[1].oldXmlValue.dataFormatVersion", "46317", "1"),
                new("skjemainnhold[1].oldXmlValue.fixedInt", "-42", "0"),
            },
            errors
        );
        Assert.Equal(
            "Property \"skjemainnhold[1].oldXmlValue.fixedInt\" has the fixed value \"-42\", but was \"0\"",
            errors[2].ToString()
        );

        // The fixed values are restored, other values are kept
        Assert.Equal("7117", skjema.Skjemainnhold[0]!.OldXmlValue!.orid);
        Assert.Equal("46317", skjema.Skjemainnhold[1]!.OldXmlValue!.dataFormatVersion);
        Assert.Equal(-42, skjema.Skjemainnhold[1]!.OldXmlValue!.fixedInt);
        Assert.Equal(42, skjema.Skjemainnhold[0]!.OldXmlValue!.valueNullable);
        Assert.Empty(CreateWrapper(skjema, reflection).RestoreFixedValues());
    }
}

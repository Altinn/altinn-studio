using Altinn.App.Core.Internal.Data;
using Altinn.App.SourceGenerator.Integration.Tests.Models;
using Xunit;

namespace Altinn.App.SourceGenerator.Integration.Tests.UnitTest;

public class TestAddIndexToPath
{
    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void Run(bool reflection)
    {
        var data = new Skjema();

        IFormDataWrapper wrapper = reflection
            ? new ReflectionFormDataWrapper(data)
            : new Altinn_App_SourceGenerator_Integration_Tests_Models_SkjemaFormDataWrapper(data);
        Assert.Equal("skjemainnhold[214]", wrapper.AddIndexToPath("skjemainnhold", [214]));
        Assert.Equal("skjemainnhold[214].navn", wrapper.AddIndexToPath("skjemainnhold.navn", [214, 33]));
        Assert.Equal("skjemainnhold[214].alder", wrapper.AddIndexToPath("skjemainnhold.alder", [214]));
        Assert.Null(wrapper.AddIndexToPath("skjemainnhold.finnes-ikke", [214, 1]));
        Assert.Equal(
            "skjemainnhold[2147483647].adresse.gate",
            wrapper.AddIndexToPath("skjemainnhold.adresse.gate", [int.MaxValue])
        );
        Assert.Equal(
            "skjemainnhold[0].tidligere-adresse[4].gate",
            wrapper.AddIndexToPath("skjemainnhold.tidligere-adresse.gate", [0, 4])
        );
        Assert.Equal(
            "skjemainnhold[0].tidligere-adresse[4]",
            wrapper.AddIndexToPath("skjemainnhold.tidligere-adresse", [0, 4])
        );

        Assert.Equal(
            "skjemainnhold[0].tidligere-adresse[6]",
            wrapper.AddIndexToPath("skjemainnhold.tidligere-adresse[6]", [0, 4])
        );

        Assert.Equal(
            "skjemainnhold[6].tidligere-adresse",
            wrapper.AddIndexToPath("skjemainnhold[6].tidligere-adresse", [0, 4])
        );
        Assert.Null(wrapper.AddIndexToPath("skjemainnhold[6].tidligere-adresse.gate", [0, 4]));

        Assert.Equal("skjemainnhold", wrapper.AddIndexToPath("skjemainnhold", []));
        Assert.Null(wrapper.AddIndexToPath("skjemainnhold.navn", []));
        Assert.Null(wrapper.AddIndexToPath("", []));
        Assert.Null(wrapper.AddIndexToPath(null, []));
    }
}

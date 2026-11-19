using System;
using Altinn.App.Core.Internal.Data;
using Altinn.App.SourceGenerator.Integration.Tests.Models;
using Xunit;

namespace Altinn.App.SourceGenerator.Integration.Tests.UnitTest;

public class TestReplaceBackingData
{
    private static IFormDataWrapper CreateWrapper(Skjema data, bool reflection) =>
        reflection
            ? new ReflectionFormDataWrapper(data, null!)
            : new Altinn_App_SourceGenerator_Integration_Tests_Models_SkjemaFormDataWrapper(data, null!);

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void ReplaceBackingData_HoldsTheGivenObject(bool reflection)
    {
        var original = new Skjema { Skjemanummer = "original" };
        var replacement = new Skjema { Skjemanummer = "replaced" };
        IFormDataWrapper wrapper = CreateWrapper(original, reflection);

        wrapper.ReplaceBackingData(replacement);
        replacement.Skjemaversjon = "changed after the call";

        Assert.Same(replacement, wrapper.BackingData<Skjema>());
        Assert.Equal("replaced", wrapper.Get("skjemanummer"));
        Assert.Equal("changed after the call", wrapper.Get("skjemaversjon"));
        Assert.True(wrapper.Set("skjemanummer", "set through the wrapper"));
        Assert.Equal("set through the wrapper", replacement.Skjemanummer);
        Assert.Equal("original", original.Skjemanummer);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void ReplaceBackingData_WithAnotherType_Throws(bool reflection)
    {
        var original = new Skjema();
        IFormDataWrapper wrapper = CreateWrapper(original, reflection);

        Assert.Throws<ArgumentException>(() => wrapper.ReplaceBackingData(new Empty()));
        Assert.Throws<ArgumentException>(() => wrapper.ReplaceBackingData(null!));
        Assert.Same(original, wrapper.BackingData<Skjema>());
    }
}

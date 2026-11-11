using System;
using Altinn.App.Core.Internal.Data;
using Altinn.App.SourceGenerator.Integration.Tests.Models;
using Xunit;

namespace Altinn.App.SourceGenerator.Integration.Tests.UnitTest;

public class TestCopyFrom
{
    private static IFormDataWrapper CreateWrapper(Skjema data, bool reflection) =>
        reflection
            ? new ReflectionFormDataWrapper(data, null!)
            : new Altinn_App_SourceGenerator_Integration_Tests_Models_SkjemaFormDataWrapper(data, null!);

    private static Skjema CreateSkjema(string value) =>
        new()
        {
            Skjemanummer = value,
            Skjemainnhold =
            [
                new()
                {
                    AltinnRowId = Guid.NewGuid(),
                    Navn = value,
                    Adresse = new() { Gate = value },
                    TidligereAdresse = [new() { Gate = value, Tags = [value] }],
                },
            ],
            EierAdresse = new() { Gate = value },
        };

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void CopyFrom_GivesTheWrappedObjectTheStateOfTheSource(bool reflection)
    {
        Skjema target = CreateSkjema("old");
        target.Skjemaversjon = "only in the old data";
        Skjema source = CreateSkjema("new");
        IFormDataWrapper wrapper = CreateWrapper(target, reflection);

        wrapper.CopyFrom(source);

        Assert.Same(target, wrapper.BackingData<Skjema>());
        Assert.Equivalent(source, target, strict: true);
        Assert.Null(target.Skjemaversjon);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void CopyFrom_SharesNoObjectsWithTheSource(bool reflection)
    {
        Skjema target = CreateSkjema("old");
        Skjema source = CreateSkjema("new");

        CreateWrapper(target, reflection).CopyFrom(source);
        source.EierAdresse!.Gate = "changed after the copy";
        source.Skjemainnhold![0]!.Adresse!.Gate = "changed after the copy";
        source.Skjemainnhold[0]!.TidligereAdresse![0]!.Tags![0] = "changed after the copy";
        source.Skjemainnhold.Add(new());

        Assert.Equivalent(CreateSkjemaWithRowId("new", target), target, strict: true);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void CopyFrom_KeepsAMemberThatIsNotAFieldOfTheDataModel(bool reflection)
    {
        Skjema target = CreateSkjema("old");
        target.NotInDataModel = "kept";
        Skjema source = CreateSkjema("new");
        source.NotInDataModel = "not copied";

        CreateWrapper(target, reflection).CopyFrom(source);

        Assert.Equal("kept", target.NotInDataModel);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void CopyFrom_TheWrappedObject_KeepsTheObjectsInsideIt(bool reflection)
    {
        Skjema target = CreateSkjema("old");
        var eierAdresse = target.EierAdresse;
        var skjemainnhold = target.Skjemainnhold;

        CreateWrapper(target, reflection).CopyFrom(target);

        Assert.Same(eierAdresse, target.EierAdresse);
        Assert.Same(skjemainnhold, target.Skjemainnhold);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void CopyFrom_AModelOfAnotherType_Throws(bool reflection)
    {
        IFormDataWrapper wrapper = CreateWrapper(CreateSkjema("old"), reflection);

        Assert.Throws<ArgumentException>(() => wrapper.CopyFrom(new Empty()));
    }

    private static Skjema CreateSkjemaWithRowId(string value, Skjema rowIdsFrom)
    {
        Skjema skjema = CreateSkjema(value);
        skjema.Skjemainnhold![0]!.AltinnRowId = rowIdsFrom.Skjemainnhold![0]!.AltinnRowId;
        return skjema;
    }
}

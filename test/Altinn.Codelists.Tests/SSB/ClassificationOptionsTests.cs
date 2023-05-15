using Altinn.Codelists.SSB;
using Altinn.Codelists.SSB.Clients;

namespace Altinn.Codelists.Tests.SSB;

public class ClassificationOptionsTests
{
    [Fact]
    public void ClassificationOptions_True_MapNotesToDescription()
    {
        var classificationOptions = new ClassificationOptions() { MapNotesToDescription = true };

        classificationOptions.GetDescription(new ClassificationCode("1", "Ja", "1") { Notes = "Test" }).Should().Be("Test");
    }

    [Fact]
    public void ClassificationOptions_False_MapNotesToDescription()
    {
        var classificationOptions = new ClassificationOptions();

        classificationOptions.GetDescription(new ClassificationCode("1", "Ja", "1")).Should().BeEmpty();
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void ClassificationOptions_FunctionProvided_FunctionShouldMapToDescription(bool mapNotesToDescription)
    {
        var classificationOptions = new ClassificationOptions() { MapDescriptionFunc = (classificationCode) => classificationCode.Notes, MapNotesToDescription = mapNotesToDescription };
        var classificationCode = new ClassificationCode("9112", "Renholdere i virksomheter", "4")
        {
            Notes = "Test"
        };

        classificationOptions.GetDescription(classificationCode).Should().Be("Test");
    }

    [Fact]
    public void ClassificationOptions_True_MapNotesToHelpText()
    {
        var classificationOptions = new ClassificationOptions() { MapNotesToDescription = true };

        classificationOptions.GetHelpText(new ClassificationCode("1", "Ja", "1") { Notes = "Test" }).Should().Be("Test");
    }

    [Fact]
    public void ClassificationOptions_False_MapNotesToHelpText()
    {
        var classificationOptions = new ClassificationOptions();

        classificationOptions.GetHelpText(new ClassificationCode("1", "Ja", "1")).Should().BeEmpty();
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void ClassificationOptions_FunctionProvided_FunctionShouldMapToHelpText(bool mapNotesToHelpText)
    {
        var classificationOptions = new ClassificationOptions() { MapDescriptionFunc = (classificationCode) => classificationCode.Notes, MapNotesToDescription = mapNotesToHelpText };
        var classificationCode = new ClassificationCode("9112", "Renholdere i virksomheter", "4")
        {
            Notes = "Test"
        };

        classificationOptions.GetHelpText(classificationCode).Should().Be("Test");
    }
}

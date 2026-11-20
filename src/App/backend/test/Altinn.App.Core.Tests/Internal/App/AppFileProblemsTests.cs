using Altinn.App.Core.Internal.App;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Tests.Internal.App;

public class AppFileProblemsTests
{
    [Fact]
    public void An_error_sets_HasErrors()
    {
        var problems = new AppFileProblems();
        Assert.False(problems.HasErrors);

        problems.Error("ui/footer.json", "broken");

        Assert.True(problems.HasErrors);
    }

    [Fact]
    public void A_diagnostic_alone_has_no_errors()
    {
        var problems = new AppFileProblems();

        problems.Diagnostic(LogLevel.Warning, "ui/footer.json", "unused");

        Assert.False(problems.HasErrors);
        Assert.Equal<AppFileDiagnostic>(
            [new AppFileDiagnostic(LogLevel.Warning, "ui/footer.json", "unused")],
            problems.Diagnostics
        );
    }

    [Fact]
    public void ToException_lists_every_error_sorted_in_the_format_of_the_loader()
    {
        var problems = new AppFileProblems();
        problems.Error("ui/footer.json", "second");
        problems.Error("config/texts/resource.nb.json", "first");

        var exception = problems.ToException();

        Assert.Equal(
            "The app files cannot be loaded. Fix the following and restart the app:"
                + Environment.NewLine
                + " - config/texts/resource.nb.json: first"
                + Environment.NewLine
                + " - ui/footer.json: second",
            exception.Message
        );
    }

    [Fact]
    public void Diagnostics_are_sorted_by_path_then_message()
    {
        var problems = new AppFileProblems();
        problems.Diagnostic(LogLevel.Warning, "ui/footer.json", "b");
        problems.Diagnostic(LogLevel.Warning, "ui/footer.json", "a");
        problems.Diagnostic(LogLevel.Warning, "config/texts/resource.nb.json", "c");

        Assert.Equal<AppFileDiagnostic>(
            [
                new AppFileDiagnostic(LogLevel.Warning, "config/texts/resource.nb.json", "c"),
                new AppFileDiagnostic(LogLevel.Warning, "ui/footer.json", "a"),
                new AppFileDiagnostic(LogLevel.Warning, "ui/footer.json", "b"),
            ],
            problems.Diagnostics
        );
    }
}

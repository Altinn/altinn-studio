using PublicApiGenerator;

namespace Altinn.App.Api.Tests;

public class PublicApiTests
{
    private static readonly string[] _excludedAttributes =
    [
        "System.Runtime.CompilerServices.RefSafetyRulesAttribute",
        "System.Diagnostics.DebuggerNonUserCodeAttribute",
        "System.ComponentModel.EditorBrowsableAttribute",
        "System.Runtime.CompilerServices.InternalsVisibleToAttribute",
    ];

    [Fact]
    public async Task PublicApi_ShouldNotChange_Unintentionally()
    {
        // Arrange
        var assembly = typeof(Altinn.App.Api.Extensions.ServiceCollectionExtensions).Assembly;

        // Act
        var publicApi = assembly.GeneratePublicApi(new ApiGeneratorOptions { ExcludeAttributes = _excludedAttributes });

        // Assert — the trailing newline is the file's own convention, and Verify writes exactly
        // what it is given: without it every rewrite drops the last newline and the next change
        // churns an extra line putting it back. A literal "\n" rather than Environment.NewLine:
        // the file is committed with LF, and the Windows leg of the build would otherwise depend on
        // Verify normalizing the difference away.
        await Verify(publicApi + "\n");
    }
}

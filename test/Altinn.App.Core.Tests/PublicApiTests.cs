using PublicApiGenerator;

namespace Altinn.App.Core.Tests;

public class PublicApiTests
{
    private static readonly string[] _excludedAttributes =
    [
        "System.Runtime.CompilerServices.RefSafetyRulesAttribute",
        "System.Diagnostics.DebuggerNonUserCodeAttribute",
        "System.ComponentModel.EditorBrowsableAttribute",
        "System.Runtime.CompilerServices.InternalsVisibleToAttribute",
    ];

#if NET10_0_OR_GREATER
    [Fact]
    public async Task PublicApi_ShouldNotChange_Unintentionally()
    {
        // Arrange
        var assembly = typeof(Altinn.App.Core.Extensions.ServiceCollectionExtensions).Assembly;

        // Act
        var publicApi = assembly.GeneratePublicApi(new ApiGeneratorOptions { ExcludeAttributes = _excludedAttributes });

        // Assert
        await Verify(publicApi);
    }
#endif
}

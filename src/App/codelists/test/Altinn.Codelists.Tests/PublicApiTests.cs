using PublicApiGenerator;

namespace Altinn.Codelists.Tests;

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
        var assembly = typeof(Altinn.Codelists.Extensions.ServiceCollectionExtensions).Assembly;

        // Act
        var publicApi = assembly.GeneratePublicApi(new ApiGeneratorOptions { ExcludeAttributes = _excludedAttributes });

        // Assert
        await Verify(publicApi);
    }
}

#nullable disable
namespace Altinn.App.Core.Tests.Infrastructure.Clients.Storage.TestData;

/// <summary>
/// Example Model used in tests
/// </summary>
public class ExampleModel
{
    /// <summary>
    /// The name
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// The age
    /// </summary>
    public int Age { get; set; } = 0;

    public bool ShouldError { get; set; } = false;

    public string Error
    {
        get { return ShouldError ? throw new Exception() : string.Empty; }
        set { }
    }
}

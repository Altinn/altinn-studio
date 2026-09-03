namespace Altinn.App.Api.Tests.Mocks;

/// <summary>
/// A minimal role DTO for <see cref="PepWithPDPAuthorizationMockSI"/>'s test-fixture-backed
/// role lookup. Matches the shape of the roles.json test data files under Data/authorization/roles.
/// </summary>
public class Role
{
    public string? Type { get; set; }

    public string? Value { get; set; }
}

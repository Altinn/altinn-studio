using Altinn.App.Core.Features;

namespace Altinn.App.Core.Tests.Models.AuthenticationMethodTest;

public class AuthenticationMethodTest
{
    [Fact]
    public void CurrentUser_CreatesCorrectType()
    {
        var currentUser = AuthenticationMethod.CurrentUser();
        Assert.IsType<AuthenticationMethod.UserToken>(currentUser);
    }

    [Fact]
    public void ServiceOwner_CreatesCorrectType_WithCorrectScope()
    {
        var serviceOwnerDefault = AuthenticationMethod.ServiceOwner();
        var serviceOwnerExtra = AuthenticationMethod.ServiceOwner("extra-scope");

        Assert.IsType<AuthenticationMethod.AltinnToken>(serviceOwnerDefault);
        Assert.IsType<AuthenticationMethod.AltinnToken>(serviceOwnerExtra);

        Assert.Equivalent(
            new[] { "altinn:serviceowner/instances.read", "altinn:serviceowner/instances.write" },
            serviceOwnerDefault.Scopes
        );
        Assert.Equivalent(
            new[] { "altinn:serviceowner/instances.read", "altinn:serviceowner/instances.write", "extra-scope" },
            serviceOwnerExtra.Scopes
        );
    }

    [Fact]
    public void Maskinporten_CreatesCorrectType_WithCorrectScope()
    {
        var maskinporten1 = AuthenticationMethod.Maskinporten("scope1", "scope2");
        var maskinporten2 = AuthenticationMethod.Maskinporten(["scope1", "scope2"]);

        Assert.IsType<AuthenticationMethod.MaskinportenToken>(maskinporten1);
        Assert.IsType<AuthenticationMethod.MaskinportenToken>(maskinporten2);

        Assert.Equivalent(new[] { "scope1", "scope2" }, maskinporten1.Scopes);
        Assert.Equivalent(new[] { "scope1", "scope2" }, maskinporten2.Scopes);
    }

    [Fact]
    public async Task Custom_CreatesCorrectType_StoresCallbackAppropriately()
    {
        // Arrange
        var testToken = TestAuthentication.GetMaskinportenToken("custom-scope").AccessToken;
        var customAuth = AuthenticationMethod.Custom(() => Task.FromResult(testToken));

        // Act
        var result = await customAuth.TokenProvider.Invoke();

        // Assert
        Assert.IsType<AuthenticationMethod.CustomToken>(customAuth);
        Assert.Contains("maskinporten.no", result.Issuer);
        Assert.Equal("custom-scope", result.Scope);
    }
}

using Altinn.App.Core.Internal.Language;
using Altinn.Platform.Profile.Models;
using FluentAssertions;

namespace Altinn.App.Core.Tests.Features.Auth;

public class AuthenticationInfoTests
{
    [Fact]
    public async Task Test_User_Get_Language_From_Profile()
    {
        var user = TestAuthentication.GetUserAuthentication(
            profileSettingPreference: new ProfileSettingPreference { Language = LanguageConst.En }
        );

        var lang = await user.GetLanguage();

        lang.Should().Be(LanguageConst.En);
    }

    [Fact]
    public async Task Test_User_Get_Default_Language()
    {
        var user = TestAuthentication.GetUserAuthentication();

        var lang = await user.GetLanguage();

        lang.Should().Be(LanguageConst.Nb);
    }

    [Fact]
    public async Task Test_Unauth_Get_Default_Language()
    {
        var user = TestAuthentication.GetNoneAuthentication();

        var lang = await user.GetLanguage();

        lang.Should().Be(LanguageConst.Nb);
    }
}

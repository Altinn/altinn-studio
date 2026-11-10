using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Designer.Tests.Controllers.AppScopesController.Utils;

/// <summary>
/// Authenticates a user whose access token only grants access on behalf of an organization other than the app owner.
/// </summary>
public class TestOidcOtherOrgAuthHandler : TestOidcAuthHandler
{
    public TestOidcOtherOrgAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder
    )
        : base(options, logger, encoder) { }

    protected override string AuthorizedPartyOrgNumber => "123456789";
}

using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.Extensions.Options;

namespace Designer.Tests.Controllers.ApiTests;

public class TestSchemeProvider : AuthenticationSchemeProvider
{
    public TestSchemeProvider(IOptions<AuthenticationOptions> options)
        : base(options)
    {
    }

    protected TestSchemeProvider(IOptions<AuthenticationOptions> options, IDictionary<string, AuthenticationScheme> schemes)
        : base(options, schemes)
    {
    }

    public override Task<AuthenticationScheme> GetSchemeAsync(string name)
    {
        // Replace cookies scheme used in oidc setup with test scheme
        if (name is CookieAuthenticationDefaults.AuthenticationScheme or AnsattPortenConstants.AnsattportenAuthenticationScheme)
        {
            return base.GetSchemeAsync(TestAuthConstants.TestAuthenticationScheme);
        }

        return base.GetSchemeAsync(name);
    }
}

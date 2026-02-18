using System.Linq;
using Altinn.Studio.Designer.Constants;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Http;

namespace Altinn.Studio.Designer.Services.Implementation;

public class DesignerCookieProvider(IHttpContextAccessor httpContextAccessor) : IDesignerCookieProvider
{
    public string? GetDesignerCookieHeaderValue()
    {
        var cookies = httpContextAccessor.HttpContext?.Request.Cookies
            .Where(c => c.Key.StartsWith(General.DesignerCookieName))
            .Select(c => $"{c.Key}={c.Value}")
            .ToList();

        if (cookies is { Count: > 0 })
        {
            return string.Join("; ", cookies);
        }

        return null;
    }
}

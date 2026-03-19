using System.Collections.Generic;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IGitServerAuthHeadersProvider
{
    Dictionary<string, string> GetAuthHeaders();
}

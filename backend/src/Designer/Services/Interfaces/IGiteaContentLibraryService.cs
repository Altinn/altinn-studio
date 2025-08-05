using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IGiteaContentLibraryService
{
    public Task<List<Option>> GetCodeList(string org, string optionListId);
    public Task<List<string>> GetCodeListIds(string org);
    public Task<List<string>> GetLanguages(string org);
    public Task<TextResource> GetTextResource(string org, string languageCode);
    public Task<List<string>> GetTextIds(string org);
}


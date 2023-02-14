using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Services.Interfaces
{
    public interface IAppDevelopmentService
    {

        public Task<LayoutSettings> GetLayoutSettings(string org, string app, string developer);

        public Task SaveLayoutSettings(string org, string app, string developer, LayoutSettings layoutSettings);

    }
}

using Altinn.Studio.Designer.Helpers;

namespace Altinn.Studio.Designer.Models
{
    public class AltinnAppContext
    {
        public AltinnAppContext(string org, string app, string developer)
        {
            Guard.AssertValidAppRepoName(app);
            Org = org;
            App = app;
            Developer = developer;
        }
        public string Org { get; }
        public string App { get; }
        public string Developer { get; }
    }
}

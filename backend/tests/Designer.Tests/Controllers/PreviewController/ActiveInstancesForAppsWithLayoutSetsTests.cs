using Microsoft.AspNetCore.Mvc.Testing;

namespace Designer.Tests.Controllers.PreviewController
{
    public class ActiveInstancesForAppsWithLayoutSetsTests : PreviewControllerTestsBase<ActiveInstancesForAppsWithLayoutSetsTests>
    {

        public ActiveInstancesForAppsWithLayoutSetsTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.PreviewController> factory) : base(factory)
        {
        }
    }
}

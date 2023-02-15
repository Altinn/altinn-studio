using Altinn.Studio.Designer.Configuration;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers
{
    [Route("designer/api/newsettings")]
    public class TestSettingsController : ControllerBase
    {
        private readonly TestSettings _testSettings;

        public TestSettingsController(TestSettings testSettings)
        {
            _testSettings = testSettings;
        }


        [HttpGet]
        public TestSettings Get()
        {
            return _testSettings;
        }
    }
}

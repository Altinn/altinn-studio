using Altinn.Studio.Designer.Configuration;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Designer.Controllers
{
    [Route("designer/api/monitor")]
    public class MonitorController : ControllerBase
    {
        private readonly TestSomeSettings _testSomeSettings;

        public MonitorController(IOptionsMonitor<TestSomeSettings> testSettings)
        {
            _testSomeSettings = testSettings.CurrentValue;
        }


        [HttpGet]
        public TestSomeSettings Get()
        {
            return _testSomeSettings;
        }
    }
}

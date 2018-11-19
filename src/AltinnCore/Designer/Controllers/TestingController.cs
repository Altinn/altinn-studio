using System.Collections.Generic;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.ServiceMetadata;
using Microsoft.AspNetCore.Mvc;

namespace AltinnCore.Designer.Controllers
{
    /// <summary>
    /// Controller containing all actions related to testing of services
    /// </summary>
    public class TestingController : Controller
    {
        private readonly ITestingRepository _testingRepository;

        /// <summary>
        /// Initializes a new instance of the <see cref="TestingController"/> class.
        /// </summary>
        /// <param name="testingRepositoryService">The testing repository service</param>
        public TestingController(ITestingRepository testingRepositoryService)
        {
            _testingRepository = testingRepositoryService;
        }

        /// <summary>
        /// The default action for this controller. Returns a view which lists all tests for a service
        /// </summary>
        /// <param name="org">The service owner code</param>
        /// <param name="service">The service code</param>
        /// <returns>A view which lists all tests for the given service</returns>
        public IActionResult Index(string org, string service)
        {
            IList<TestMetadata> tests = _testingRepository.GetTests(org, service);

            return View(tests);
        }

        /// <summary>
        /// Action which returns a form view for creating a new test under the
        /// current service
        /// </summary>
        /// <param name="org">The service owner code</param>
        /// <param name="service">The service code</param>
        /// <returns>The create new test view</returns>
        [HttpGet]
        public ActionResult Create(string org, string service)
        {
            return View();
        }

        /// <summary>
        /// Action for creating a new test
        /// </summary>
        /// <param name="org">The service owner code</param>
        /// <param name="service">The service code</param>
        /// <param name="test">The test metadata (name required)</param>
        /// <returns>Edit view if test is created, else the create view</returns>
        [HttpPost]
        public IActionResult Create(string org, string service, TestMetadata test)
        {
            if (!ModelState.IsValid)
            {
                return View("Create", test);
            }

            if (_testingRepository.UpdateTest(org, service, test))
            {
                return RedirectToAction("Edit", new { org, service, id = test.Name });
            }
            else
            {
                return View("Create", test);
            }
        }

        /// <summary>
        /// Action for editing a specific test
        /// </summary>
        /// <param name="org">The service owner code</param>
        /// <param name="service">The service code</param>
        /// <param name="id">The name of the test</param>
        /// <returns>The contents of the test identified by the given <paramref name="name"/></returns>
        public IActionResult Edit(string org, string service, string id)
        {
            var meta = new TestMetadata
            {
                Name = id,
            };
            string test = _testingRepository.GetTest(org, service, id);

            return View(meta);
        }

        /// <summary>
        /// Action for viewing accessibility test info
        /// </summary>
        /// <param name="org">The service owner code</param>
        /// <param name="service">The service code</param>
        /// <returns>The view for accessibility testing</returns>
        public IActionResult Accessibility(string org, string service)
        {
            return View();
        }
    }
}

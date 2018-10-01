using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.ServiceMetadata;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;

namespace AltinnCore.Designer.Controllers
{
    /// <summary>
    /// Controller containing all actions related to testing of editions
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
        /// The default action for this controller. Returns a view which lists all tests for an edition
        /// </summary>
        /// <param name="org">The service owner code</param>
        /// <param name="service">The service code</param>
        /// <param name="edition">The service edition code</param>
        /// <returns>A view which lists all tests for the given edition</returns>
        public IActionResult Index(string org, string service, string edition)
        {
            IList<TestMetadata> tests = _testingRepository.GetTests(org, service, edition);

            return View(tests);
        }

        /// <summary>
        /// Action which returns a form view for creating a new test under the
        /// current edition
        /// </summary>
        /// <param name="org">The service owner code</param>
        /// <param name="service">The service code</param>
        /// <param name="edition">The service edition code</param>
        /// <returns>The create new test view</returns>
        [HttpGet]
        public ActionResult Create(string org, string service, string edition)
        {
            return View();
        }

        /// <summary>
        /// Action for creating a new test
        /// </summary>
        /// <param name="org">The service owner code</param>
        /// <param name="service">The service code</param>
        /// <param name="edition">The service edition code</param>
        /// <param name="test">The test metadata (name required)</param>
        /// <returns>Edit view if test is created, else the create view</returns>
        [HttpPost]
        public IActionResult Create(string org, string service, string edition, TestMetadata test)
        {
            if (!ModelState.IsValid)
            {
                return View("Create", test);
            }

            if (_testingRepository.UpdateTest(org, service, edition, test))
            {
                return RedirectToAction("Edit", new { org, service, edition, id = test.Name });
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
        /// <param name="edition">The service edition</param>
        /// <param name="id">The name of the test</param>
        /// <returns>The contents of the test identified by the given <paramref name="name"/></returns>
        public IActionResult Edit(string org, string service, string edition, string id)
        {
            var meta = new TestMetadata
            {
                Name = id
            };
            string test = _testingRepository.GetTest(org, service, edition, id);

            return View(meta);
        }

        /// <summary>
        /// Action for viewing accessibility test info
        /// </summary>
        /// <param name="org">The service owner code</param>
        /// <param name="service">The service code</param>
        /// <param name="edition">The service edition</param>
        /// <returns>The view for accessibility testing</returns>
        public IActionResult Accessibility(string org, string service, string edition)
        {
            return View();
        }
    }
}

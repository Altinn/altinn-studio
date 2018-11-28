using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;

namespace AltinnCore.Designer.Controllers
{
    /// <summary>
    /// The service builder API
    /// </summary>
    public class ServiceDevelopmentController : Controller
    {
        /// <summary>
        /// Default action for the designer
        /// </summary>
        /// <returns>default view for the service builder</returns>
        public IActionResult Index()
        {
            return View();
        }
    }
}

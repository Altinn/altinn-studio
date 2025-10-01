#nullable enable

using Microsoft.AspNetCore.Mvc;

namespace LocalTest.Controllers;

[Route("Home/[controller]/[action]")]
public class StorageExplorerController : Controller
{
    public IActionResult Index()
    {
        return View();
    }
}
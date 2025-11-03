#nullable disable
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers
{
    /// <summary>
    /// MVC Controller responsible for presenting HTML that
    /// </summary>
    public class ResourceAdmController : Controller
    {
        private readonly ISourceControl _sourceControl;

        public ResourceAdmController(ISourceControl sourceControl)
        {
            _sourceControl = sourceControl;
        }

    }
}

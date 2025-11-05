#nullable disable
using System;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization.Metadata;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ApplicationModels;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Mvc.Formatters;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using JsonSerializer = System.Text.Json.JsonSerializer;

namespace Altinn.Studio.Designer.Filters
{
    /// <summary>
    /// Workaround for using System.Text.Json along with Newtonsoft.Json
    /// Should be removed with https://github.com/Altinn/altinn-studio/issues/9486
    /// </summary>
    public class UseSystemTextJsonAttribute : ActionFilterAttribute, IActionModelConvention
    {
        private static readonly JsonSerializerOptions s_jsonSerializerOptions = new()
        {
            PropertyNameCaseInsensitive = true,
            Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            TypeInfoResolver = new DefaultJsonTypeInfoResolver()
        };

        public void Apply(ActionModel action)
        {
            // Use System.Text.Json for all body parameters
            var parameters = action.Parameters.Where(p => p.BindingInfo?.BindingSource == BindingSource.Body);
            foreach (var p in parameters)
            {
                p.BindingInfo!.BinderType = typeof(SystemTextJsonBodyModelBinder);
            }
        }

        // Use System.Text.Json for all ObjectResult responses
        public override void OnActionExecuted(ActionExecutedContext context)
        {
            var formatter = new SystemTextJsonOutputFormatter(s_jsonSerializerOptions);
            if (context.Result is ObjectResult objectResult)
            {
                // remove Newtonsoft formatter
                objectResult.Formatters
                    .RemoveType<NewtonsoftJsonOutputFormatter>();
                objectResult.Formatters.Add(formatter);
            }
            else
            {
                base.OnActionExecuted(context);
            }
        }

        /// <summary>
        /// Model binder for System.Text.Json
        /// </summary>
        public class SystemTextJsonBodyModelBinder : IModelBinder
        {
            public async Task BindModelAsync(ModelBindingContext bindingContext)
            {
                try
                {
                    string body = await ReadBody(bindingContext.HttpContext.Request);

                    object deserialized =
                        JsonSerializer.Deserialize(body, bindingContext.ModelType, s_jsonSerializerOptions);
                    bindingContext.Result = ModelBindingResult.Success(deserialized!);
                }
                catch (Exception ex)
                {
                    bindingContext.ModelState.AddModelError(bindingContext.ModelName, ex, bindingContext.ModelMetadata);
                }
            }

            private static async Task<string> ReadBody(HttpRequest request)
            {
                request.EnableBuffering();

                using var reader = new StreamReader(
                    request.Body,
                    encoding: Encoding.UTF8,
                    detectEncodingFromByteOrderMarks: true,
                    bufferSize: 1024,
                    leaveOpen: true);

                string body = await reader.ReadToEndAsync();
                request.Body.Seek(0, SeekOrigin.Begin);
                return body;
            }
        }
    }
}

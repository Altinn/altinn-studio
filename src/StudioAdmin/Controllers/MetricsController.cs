using System.Text.RegularExpressions;
using Altinn.Studio.Admin.Models;
using Altinn.Studio.Admin.Providers.Interfaces;
using Altinn.Studio.Admin.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Admin.Controllers;

[ApiController]
[Route("admin/api/v1/[controller]/{org}/{env}")]
public class MetricsController(
    IAzureMonitorClientService azureMonitorClientService,
    IPrometheusClientService prometheusClientService
    ) : ControllerBase
{
    private readonly IAzureMonitorClientService _azureMonitorClientService = azureMonitorClientService;
    private readonly IPrometheusClientService _prometheusClientService = prometheusClientService;


    [HttpGet]
    public async Task<ActionResult<AppMetric>> GetMetrics(
        string org,
        string env,
        CancellationToken cancellationToken,
        [FromQuery] string? app,
        [FromQuery] int time = 24,
        [FromQuery] int take = 1000
    )
    {
        var step = time >= 1140 ? "1h" : "5m";

        var upQuery = Regex.Replace($@"(
                kube_deployment_status_replicas_available{{deployment='{org}-{app}-deployment-v2'}}
                >= bool kube_deployment_spec_replicas{{deployment='{org}-{app}-deployment-v2'}}
            )
            OR on(namespace, deployment)
            absent(kube_deployment_spec_replicas{{deployment='{org}-{app}-deployment-v2'}}) * 0", @"[\t\r\n]", "").Replace("    ", "");

        var upMetrics = await _prometheusClientService.GetSeriesAsync(upQuery, time, app, "up", (dataPoints) => dataPoints.LastOrDefault()?.Count ?? 0, (count) => count == 0, step, cancellationToken);

        // 1 - LATENCY

        /*
        var slowRequests = $@"sum by (service) (
            rate(traefik_service_request_duration_seconds_sum{{service=~'^default-{org}-{app}-ingress-route-[0-9a-f]+@kubernetescrd$'}}[5m])
        ) / clamp_min(sum by (service) (
            rate(traefik_service_request_duration_seconds_count{{service=~'^default-{org}-{app}-ingress-route-[0-9a-f]+@kubernetescrd$'}}[5m])
        ), 1e-12
        )";
        */
        var slowRequestQuery = $@"histogram_quantile(
                0.95,
                clamp_min(
                    sum by (le, service) (
                        rate(traefik_service_request_duration_seconds_bucket{{service=~'^default-{org}-{app}-ingress-route-[0-9a-f]+@kubernetescrd$'}}[{step}])
                    )
                , 1e-9)
            ) * 1000";

        var slowRequestsMetrics = await _prometheusClientService.GetSeriesAsync(slowRequestQuery, time, app, "slow_requests", (dataPoints) => Math.Ceiling(dataPoints.Average(dataPoint => dataPoint.Count)), (count) => count >= 950, step, cancellationToken);

        // 2 - TRAFFIC (RPS)

        // RPS - requests per second vs requests per hour

        var requestsQuery = $@"sum by (service) (
                rate(traefik_service_requests_total{{service=~'^default-{org}-{app}-ingress-route-[0-9a-f]+@kubernetescrd$'}}[{step}])
            )";

        var requestsMetrics = await _prometheusClientService.GetSeriesAsync(requestsQuery, time, app, "requests_rps", (dataPoints) => Math.Ceiling(dataPoints.Average(dataPoint => dataPoint.Count)), (count) => false, step, cancellationToken);

        // 3 - ERRORS

        var failedRequestsQuery = $@"
                (
                sum by (service) (rate(traefik_service_requests_total{{service=~'^default-{org}-{app}-ingress-route-[0-9a-f]+@kubernetescrd$', code=~'5..'}}[{step}]))
                /
                clamp_min(
                    sum by (service) (rate(traefik_service_requests_total{{service=~'^default-{org}-{app}-ingress-route-[0-9a-f]+@kubernetescrd$'}}[{step}]))
                , 1e-9)
                ) * 100";

        var failedRequestsMetrics = await _prometheusClientService.GetSeriesAsync(failedRequestsQuery, time, app, "error_ratio", (dataPoints) => Math.Ceiling(dataPoints.Average(dataPoint => dataPoint.Count)), (count) => count >= 1, step, cancellationToken);

        // var failedRequests = await _azureMonitorClientService.GetFailedRequests(org, env, time, take, app, cancellationToken);

        // 4 - SATURATION

        // TODO: should we add container='deployment'  after namespace='default' to remove linkerd and only get app container?
        // could not use recorded rule node_namespace_pod_container:container_cpu_usage_seconds_total:sum_irate{{namespace='default', container!=''}} has window is set to 5m
        /*
                node_namespace_pod_container:container_cpu_usage_seconds_total:sum_irate{{namespace='default', container!=''}}
                * on(namespace,pod)
        */

        string cpuQuery = $@"
                sum(
                    sum by (namespace, pod, container) (
                        rate(container_cpu_usage_seconds_total{{namespace='default', container!=''}}[{step}])
                    )
                    * on(namespace,pod)
                    group_left(workload, workload_type)
                    namespace_workload_pod:kube_pod_owner:relabel{{
                        namespace='default',
                        workload_type='deployment',
                        workload='{org}-{app}-deployment-v2'
                    }}
                ) by (workload)
                /
                sum(
                    kube_pod_container_resource_requests{{namespace='default', container!='', resource='cpu'}}
                    * on(namespace,pod)
                    group_left(workload, workload_type)
                    namespace_workload_pod:kube_pod_owner:relabel{{
                        namespace='default',
                        workload_type='deployment',
                        workload='{org}-{app}-deployment-v2'
                    }}
                ) by (workload)
                * 100";

        var cpuMetrics = await _prometheusClientService.GetSeriesAsync(cpuQuery, time, app, "cpu_usage", (dataPoint) => Math.Ceiling(dataPoint.LastOrDefault()?.Count ?? 0), (count) => count >= 80, step, cancellationToken);

        string memoryQuery = $@"
                sum(
                    container_memory_working_set_bytes{{namespace='default', container!='', image!=''}}
                    * on(namespace,pod)
                    group_left(workload, workload_type)
                    namespace_workload_pod:kube_pod_owner:relabel{{
                        namespace='default',
                        workload_type='deployment',
                        workload='{org}-{app}-deployment-v2'
                    }}
                ) by (workload)
                /
                sum(
                    kube_pod_container_resource_requests{{namespace='default', container!='', resource='memory'}}
                    * on(namespace,pod)
                    group_left(workload, workload_type)
                    namespace_workload_pod:kube_pod_owner:relabel{{
                        namespace='default',
                        workload_type='deployment',
                        workload='{org}-{app}-deployment-v2'
                    }}
                ) by (workload)
                * 100";

        var memoryMetrics = await _prometheusClientService.GetSeriesAsync(memoryQuery, time, app, "memory_usage", (dataPoint) => Math.Ceiling(dataPoint.LastOrDefault()?.Count ?? 0), (count) => count >= 80, step, cancellationToken);

        List<string> appMetrics =
        [
            "altinn_app_lib_instances_created",
                "altinn_app_lib_instances_completed",
                "altinn_app_lib_instances_deleted",
                "altinn_app_lib_instances_duration",
                "altinn_app_lib_processes_started",
                "altinn_app_lib_processes_ended",
                "altinn_app_lib_processes_duration",
                "altinn_app_lib_correspondence_orders",
                "altinn_app_lib_data_patched",
                "altinn_app_lib_maskinporten_token_requests",
                "altinn_app_lib_maskinporten_altinn_exchange_requests",
                "altinn_app_lib_notification_orders",
                "altinn_app_lib_signing_delegations",
                "altinn_app_lib_signing_delegation_revokes",
                "altinn_app_lib_singing_get_service_owner_party",
                "altinn_app_lib_signing_notify_signees"
        ];

        var azureMetrics = await _azureMonitorClientService.GetMetrics(org, env, appMetrics, time, take, app, cancellationToken);

        return Ok(upMetrics.Concat(slowRequestsMetrics.Concat(requestsMetrics.Concat(failedRequestsMetrics.Concat(cpuMetrics.Concat(memoryMetrics.Concat(azureMetrics)))))));
    }
}

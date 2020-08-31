package altinn.platform.pdf.health;

import com.microsoft.applicationinsights.extensibility.TelemetryProcessor;
import com.microsoft.applicationinsights.telemetry.RequestTelemetry;
import com.microsoft.applicationinsights.telemetry.Telemetry;

public class HealthCheckTelemetryFilter implements TelemetryProcessor {

  @Override
  public boolean process(Telemetry telemetry) {
    if (telemetry instanceof RequestTelemetry) {
      RequestTelemetry request = (RequestTelemetry) telemetry;
      if (request.getUrlString().contains("actuator/health")) {
        return false;
      }
    }
    return true;
  }
}

package no.altinn.eidlogger.controller;

import no.altinn.eidlogger.dto.EidLogRequest;
import no.digdir.logging.event.ActivityRecord;
import no.digdir.logging.event.EventLogger;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;

@RestController
public class EidController {
  private final EventLogger eventLogger;

  public EidController(EventLogger eventLogger) {
    this.eventLogger = eventLogger;
  }

  @PostMapping("/eid-event-log")
  public void log(@RequestBody EidLogRequest request) {

    ActivityRecord.ActivityRecordBuilder builder = ActivityRecord.builder()
      .eventName(request.getEventName())
      .eventDescription(request.getEventDescription())
      .eventCreated(request.getEventCreated());

    if(request.getStudioData() != null && !request.getStudioData().isEmpty()) {
      builder.extraData(request.getStudioData());
    }

    ActivityRecord record = builder.build();

    eventLogger.log(record);
  }
}

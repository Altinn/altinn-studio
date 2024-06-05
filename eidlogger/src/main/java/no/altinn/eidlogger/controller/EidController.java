package no.altinn.eidlogger.controller;

import no.altinn.eidlogger.dto.EidLogRequest;
import no.digdir.logging.event.ActivityRecord;
import no.digdir.logging.event.EventLogger;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class EidController {
//  private final EventLogger eventLogger;
//
//  public EidController(EventLogger eventLogger) {
//    this.eventLogger = eventLogger;
//  }

    @PostMapping("/eid-event-log")
    public void log(@RequestBody EidLogRequest request) {

        ActivityRecord record = ActivityRecord.builder()
                .eventName(request.getEventName())
                .eventSubjectPid(request.getEventSubjectPid())
                .correlationId(request.getCorrelationId())
                .serviceProviderId(request.getServiceProviderId())
                .serviceProviderOrgno(request.getServiceProviderOrgno())
                .serviceProviderName(request.getServiceProviderName())
                .serviceOwnerId(request.getServiceOwnerId())
                .serviceOwnerOrgno(request.getServiceOwnerOrgno())
                .serviceOwnerName(request.getServiceOwnerName())
                .build();

//    eventLogger.log(record);
    }
}

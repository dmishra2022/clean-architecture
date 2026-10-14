package training.worldcheck.screening.adapter.in.rest;

import java.net.URI;

import io.micronaut.core.annotation.Nullable;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.Header;
import io.micronaut.http.annotation.Post;
import io.micronaut.http.annotation.Put;
import io.micronaut.scheduling.TaskExecutors;
import io.micronaut.scheduling.annotation.ExecuteOn;
import jakarta.validation.Valid;
import training.worldcheck.screening.adapter.in.rest.ApiModels.CaseResponse;
import training.worldcheck.screening.adapter.in.rest.ApiModels.CloseCaseRequest;
import training.worldcheck.screening.adapter.in.rest.ApiModels.OpenCaseRequest;
import training.worldcheck.screening.adapter.in.rest.ApiModels.ResolveMatchRequest;
import training.worldcheck.screening.application.CaseNotFoundException;
import training.worldcheck.screening.application.port.in.CaseView;
import training.worldcheck.screening.application.port.in.CloseCaseUseCase;
import training.worldcheck.screening.application.port.in.CloseCaseUseCase.CloseCaseCommand;
import training.worldcheck.screening.application.port.in.FindCaseQuery;
import training.worldcheck.screening.application.port.in.OpenCaseUseCase;
import training.worldcheck.screening.application.port.in.OpenCaseUseCase.OpenCaseCommand;
import training.worldcheck.screening.application.port.in.ResolveMatchUseCase;
import training.worldcheck.screening.application.port.in.ResolveMatchUseCase.ResolveMatchCommand;
import training.worldcheck.screening.application.port.in.ScreenCaseUseCase;
import training.worldcheck.screening.application.port.in.ScreenCaseUseCase.ScreenCaseCommand;
import training.worldcheck.screening.domain.model.AnalystId;
import training.worldcheck.screening.domain.model.CaseId;
import training.worldcheck.screening.domain.model.ClientGroupId;
import training.worldcheck.screening.domain.model.CountryCode;
import training.worldcheck.screening.domain.model.EntityType;
import training.worldcheck.screening.domain.model.MatchId;
import training.worldcheck.screening.domain.model.Party;
import training.worldcheck.screening.domain.model.PartyName;
import training.worldcheck.screening.domain.model.Resolution;
import training.worldcheck.screening.domain.model.ResolutionRationale;

/**
 * Driving adapter. Translates HTTP into commands, calls a use-case port, translates the view back.
 * It depends on port interfaces only, never on the application service class.
 * <p>
 * JDBC is blocking, so requests run on the blocking executor (virtual threads on Java 21+), not the Netty
 * event loop.
 */
@Controller("/api/v1/client-groups/{clientGroupId}/cases")
@ExecuteOn(TaskExecutors.BLOCKING)
public class CaseController {

    private final OpenCaseUseCase openCase;
    private final ScreenCaseUseCase screenCase;
    private final ResolveMatchUseCase resolveMatch;
    private final CloseCaseUseCase closeCase;
    private final FindCaseQuery findCase;

    public CaseController(OpenCaseUseCase openCase, ScreenCaseUseCase screenCase, ResolveMatchUseCase resolveMatch,
                          CloseCaseUseCase closeCase, FindCaseQuery findCase) {
        this.openCase = openCase;
        this.screenCase = screenCase;
        this.resolveMatch = resolveMatch;
        this.closeCase = closeCase;
        this.findCase = findCase;
    }

    @Post
    public HttpResponse<CaseResponse> open(String clientGroupId,
                                           @Nullable @Header("Idempotency-Key") String idempotencyKey,
                                           @Valid @Body OpenCaseRequest request) {
        Party party = new Party(
                new PartyName(request.name()),
                EntityType.valueOf(request.entityType()),
                request.dateOfBirth(),
                CountryCode.ofNullable(request.country()));
        CaseView view = openCase.open(new OpenCaseCommand(new ClientGroupId(clientGroupId), party, idempotencyKey));
        return HttpResponse.created(CaseResponse.of(view),
                URI.create("/api/v1/client-groups/" + clientGroupId + "/cases/" + view.caseId()));
    }

    @Get("/{caseId}")
    public CaseResponse get(String clientGroupId, String caseId) {
        CaseId id = CaseId.of(caseId);
        return findCase.find(new ClientGroupId(clientGroupId), id)
                .map(CaseResponse::of)
                .orElseThrow(() -> new CaseNotFoundException(id));
    }

    @Post("/{caseId}/screenings")
    public CaseResponse screen(String clientGroupId, String caseId) {
        return CaseResponse.of(screenCase.screen(
                new ScreenCaseCommand(new ClientGroupId(clientGroupId), CaseId.of(caseId))));
    }

    @Put("/{caseId}/matches/{matchId}/resolution")
    public CaseResponse resolve(String clientGroupId, String caseId, String matchId,
                                @Valid @Body ResolveMatchRequest request) {
        return CaseResponse.of(resolveMatch.resolve(new ResolveMatchCommand(
                new ClientGroupId(clientGroupId),
                CaseId.of(caseId),
                MatchId.of(matchId),
                Resolution.valueOf(request.resolution()),
                new ResolutionRationale(request.rationale()),
                new AnalystId(request.analystId()))));
    }

    @Post("/{caseId}/closure")
    public CaseResponse close(String clientGroupId, String caseId, @Valid @Body CloseCaseRequest request) {
        return CaseResponse.of(closeCase.close(new CloseCaseCommand(
                new ClientGroupId(clientGroupId), CaseId.of(caseId), new AnalystId(request.analystId()))));
    }
}

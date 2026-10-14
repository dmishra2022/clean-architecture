package training.clean.screening.app;

import static com.tngtech.archunit.base.DescribedPredicate.alwaysTrue;
import static com.tngtech.archunit.core.domain.JavaClass.Predicates.resideInAnyPackage;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.library.Architectures.layeredArchitecture;
import static com.tngtech.archunit.library.dependencies.SlicesRuleDefinition.slices;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import org.junit.jupiter.api.Test;

/**
 * The Maven modules already make the compiler enforce the dependency rule between rings (ring 1 cannot even see
 * ring 2). These rules cover what module boundaries cannot express: who may touch what inside and across rings.
 */
class CleanArchitectureTest {

    private static final String ENTITIES = "training.clean.screening.entities..";
    private static final String USE_CASES = "training.clean.screening.usecases..";
    private static final String ADAPTERS = "training.clean.screening.adapters..";
    private static final String FRAMEWORKS = "training.clean.screening.app..";

    private static final JavaClasses PRODUCTION = new ClassFileImporter()
            .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
            .importPackages("training.clean.screening");

    @Test
    void dependenciesPointInwards() {
        layeredArchitecture()
                .consideringOnlyDependenciesInLayers()
                .layer("Entities").definedBy(ENTITIES)
                .layer("Use cases").definedBy(USE_CASES)
                .layer("Interface adapters").definedBy(ADAPTERS)
                .layer("Frameworks and drivers").definedBy(FRAMEWORKS)
                .whereLayer("Frameworks and drivers").mayNotBeAccessedByAnyLayer()
                .whereLayer("Interface adapters").mayOnlyBeAccessedByLayers("Frameworks and drivers")
                .whereLayer("Use cases").mayOnlyBeAccessedByLayers("Interface adapters", "Frameworks and drivers")
                .check(PRODUCTION);
    }

    @Test
    void innerRingsKnowNoFramework() {
        noClasses().that().resideInAnyPackage(ENTITIES, USE_CASES, ADAPTERS)
                .should().dependOnClassesThat().resideInAnyPackage(
                        "io.micronaut..", "jakarta..", "javax..", "org.slf4j..", "com.fasterxml..", "java.sql..")
                .because("rings 1-3 are plain Java; Micronaut, JDBC and JSON libraries are details of ring 4")
                .check(PRODUCTION);
    }

    @Test
    void useCasesAreIndependentOfEachOther() {
        slices().matching("training.clean.screening.usecases.(*)..")
                .should().notDependOnEachOther()
                .ignoreDependency(alwaysTrue(), resideInAnyPackage(
                        "training.clean.screening.usecases.shared..", "training.clean.screening.usecases.gateway.."))
                .because("each use case changes for one actor's reasons; shared code lives in shared or gateway")
                .check(PRODUCTION);
    }

    @Test
    void onlyMainKnowsTheInteractors() {
        classes().that().haveSimpleNameEndingWith("Interactor")
                .should().onlyHaveDependentClassesThat().resideInAnyPackage(USE_CASES, "training.clean.screening.app.config..")
                .because("controllers call input boundaries; only the Main component may construct an interactor")
                .check(PRODUCTION);
    }

    @Test
    void webAdaptersSeeResponseModelsNotEntities() {
        noClasses().that().resideInAPackage("training.clean.screening.adapters.web..")
                .should().dependOnClassesThat().resideInAPackage(ENTITIES)
                .because("presenters receive plain response models, so the UI cannot call domain behaviour")
                .check(PRODUCTION);
    }

    @Test
    void endpointsOnlyTalkToControllers() {
        noClasses().that().resideInAPackage("training.clean.screening.app.web..")
                .should().dependOnClassesThat().resideInAnyPackage(ENTITIES, USE_CASES)
                .because("the framework endpoint is a humble object: routes in, view model out")
                .check(PRODUCTION);
    }
}

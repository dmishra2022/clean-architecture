package training.worldcheck.screening.architecture;

import static com.tngtech.archunit.base.DescribedPredicate.alwaysTrue;
import static com.tngtech.archunit.core.domain.JavaClass.Predicates.resideInAPackage;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.library.Architectures.onionArchitecture;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import org.junit.jupiter.api.Test;
import training.worldcheck.screening.application.CaseApplicationService;

/** The dependency rule as executable tests. A pull request that breaks the hexagon fails the build. */
class HexagonalArchitectureTest {

    private static final JavaClasses PRODUCTION = new ClassFileImporter()
            .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
            .importPackages("training.worldcheck.screening");

    @Test
    void dependenciesPointInwards() {
        onionArchitecture()
                .domainModels("..domain..")
                .applicationServices("..application..")
                .adapter("rest", "..adapter.in.rest..")
                .adapter("persistence", "..adapter.out.persistence..")
                .adapter("events", "..adapter.out.events..")
                .adapter("reference", "..adapter.out.reference..")
                .withOptionalLayers(true)
                .ignoreDependency(resideInAPackage("..config.."), alwaysTrue())
                .because("config is the composition root: the one place allowed to see every ring")
                .check(PRODUCTION);
    }

    @Test
    void domainIsPlainJava() {
        noClasses().that().resideInAPackage("..domain..")
                .should().dependOnClassesThat().resideInAnyPackage("io.micronaut..", "jakarta..", "javax..",
                        "org.slf4j..", "com.fasterxml..")
                .because("the domain model must compile and run without any framework")
                .check(PRODUCTION);
    }

    @Test
    void applicationIsPlainJava() {
        noClasses().that().resideInAPackage("..application..")
                .should().dependOnClassesThat().resideInAnyPackage("io.micronaut..", "jakarta..", "javax..")
                .because("use cases are wired by config.ApplicationWiring, not by annotations")
                .check(PRODUCTION);
    }

    @Test
    void adaptersUsePortsNotTheService() {
        noClasses().that().resideInAPackage("..adapter..")
                .should().dependOnClassesThat().areAssignableTo(CaseApplicationService.class)
                .because("driving adapters call use-case interfaces so the implementation can change")
                .check(PRODUCTION);
    }

    @Test
    void onlyStorageAdaptersTouchMicronautData() {
        noClasses().that().resideOutsideOfPackages("..adapter.out.persistence..", "..adapter.out.events..")
                .should().dependOnClassesThat().resideInAPackage("io.micronaut.data..")
                .check(PRODUCTION);
    }
}

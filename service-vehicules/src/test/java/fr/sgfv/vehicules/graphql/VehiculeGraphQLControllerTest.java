package fr.sgfv.vehicules.graphql;

import fr.sgfv.vehicules.dto.VehiculeDTO;
import fr.sgfv.vehicules.service.VehiculeService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.graphql.GraphQlTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.graphql.test.tester.GraphQlTester;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@GraphQlTest(VehiculeGraphQLController.class)
class VehiculeGraphQLControllerTest {

    @Autowired
    private GraphQlTester graphQlTester;

    @MockBean
    private VehiculeService vehiculeService;

    @Test
    void testListVehicules() {
        VehiculeDTO v = VehiculeDTO.builder()
                .id(UUID.randomUUID())
                .plaque("GQL-123")
                .build();
        
        when(vehiculeService.listerVehicules(any(), any())).thenReturn(List.of(v));

        String query = """
            query {
                vehicules {
                    id
                    plaque
                }
            }
        """;

        graphQlTester.document(query)
                .execute()
                .path("vehicules")
                .entityList(VehiculeDTO.class)
                .hasSize(1);
    }

    @Test
    void testGetVehicule() {
        UUID id = UUID.randomUUID();
        VehiculeDTO v = VehiculeDTO.builder()
                .id(id)
                .plaque("GQL-456")
                .build();

        when(vehiculeService.getVehicule(id)).thenReturn(v);

        String query = """
            query($id: ID!) {
                vehicule(id: $id) {
                    id
                    plaque
                }
            }
        """;

        graphQlTester.document(query)
                .variable("id", id.toString())
                .execute()
                .path("vehicule.plaque")
                .entity(String.class)
                .isEqualTo("GQL-456");
    }

    @Test
    void testCreerVehicule() {
        VehiculeDTO v = VehiculeDTO.builder()
                .id(UUID.randomUUID())
                .plaque("NEW-789")
                .build();

        when(vehiculeService.creerVehicule(any())).thenReturn(v);

        String mutation = """
            mutation($input: CreateVehiculeInput!) {
                creerVehicule(input: $input) {
                    id
                    plaque
                }
            }
        """;

        graphQlTester.document(mutation)
                .variable("input", Map.of(
                        "plaque", "NEW-789",
                        "marque", "Test",
                        "modele", "Test",
                        "annee", 2023
                ))
                .execute()
                .path("creerVehicule.plaque")
                .entity(String.class)
                .isEqualTo("NEW-789");
    }

    @Test
    void testChangerStatut() {
        UUID id = UUID.randomUUID();
        VehiculeDTO v = VehiculeDTO.builder()
                .id(id)
                .statut("EN_MISSION")
                .build();

        when(vehiculeService.changerStatut(eq(id), any())).thenReturn(v);

        String mutation = """
            mutation($id: ID!, $statut: String!) {
                changerStatut(id: $id, statut: $statut) {
                    id
                    statut
                }
            }
        """;

        graphQlTester.document(mutation)
                .variable("id", id.toString())
                .variable("statut", "EN_MISSION")
                .execute()
                .path("changerStatut.statut")
                .entity(String.class)
                .isEqualTo("EN_MISSION");
    }

    @Test
    void testArchiverVehicule() {
        UUID id = UUID.randomUUID();
        VehiculeDTO v = VehiculeDTO.builder()
                .id(id)
                .statut("HORS_SERVICE")
                .build();

        when(vehiculeService.archiverVehicule(id)).thenReturn(v);

        String mutation = """
            mutation($id: ID!) {
                archiverVehicule(id: $id) {
                    id
                    statut
                }
            }
        """;

        graphQlTester.document(mutation)
                .variable("id", id.toString())
                .execute()
                .path("archiverVehicule.statut")
                .entity(String.class)
                .isEqualTo("HORS_SERVICE");
    }
}

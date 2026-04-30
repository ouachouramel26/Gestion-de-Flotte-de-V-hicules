package fr.sgfv.conducteurs.service;

import lombok.extern.slf4j.Slf4j;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.KeycloakBuilder;
import org.keycloak.admin.client.resource.UsersResource;
import org.keycloak.representations.idm.CredentialRepresentation;
import org.keycloak.representations.idm.UserRepresentation;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.ws.rs.core.Response;
import java.util.Collections;
import java.util.List;

@Service
@Slf4j
public class KeycloakService {

    @Value("${keycloak.admin.server-url}")
    private String serverUrl;

    @Value("${keycloak.admin.realm}")
    private String adminRealm;

    @Value("${keycloak.admin.username}")
    private String username;

    @Value("${keycloak.admin.password}")
    private String password;

    @Value("${keycloak.admin.client-id}")
    private String clientId;

    @Value("${keycloak.target-realm}")
    private String targetRealm;

    public String createKeycloakUser(String firstName, String lastName, String email, String defaultPassword) {
        Keycloak keycloak = KeycloakBuilder.builder()
                .serverUrl(serverUrl)
                .realm(adminRealm)
                .username(username)
                .password(password)
                .clientId(clientId)
                .build();

        UserRepresentation user = new UserRepresentation();
        user.setEnabled(true);
        user.setUsername(email);
        user.setEmail(email);
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setEmailVerified(true);

        // Définition du mot de passe
        CredentialRepresentation credential = new CredentialRepresentation();
        credential.setType(CredentialRepresentation.PASSWORD);
        credential.setValue(defaultPassword);
        credential.setTemporary(true); // Oblige le changement au premier login
        user.setCredentials(Collections.singletonList(credential));

        // Action requise : Changement de mot de passe
        user.setRequiredActions(Collections.singletonList("UPDATE_PASSWORD"));

        UsersResource usersResource = keycloak.realm(targetRealm).users();
        Response response = usersResource.create(user);

        if (response.getStatus() == 201) {
            String userId = response.getLocation().getPath().replaceAll(".*/([^/]+)$", "$1");
            log.info("Utilisateur Keycloak créé avec succès : {} (ID: {})", email, userId);
            
            // Assigner le rôle "conducteur"
            assignRole(usersResource, userId, "conducteur");
            
            return userId;
        } else if (response.getStatus() == 409) {
            // L'utilisateur existe déjà, on le récupère par son email
            log.info("L'utilisateur {} existe déjà dans Keycloak, récupération de l'ID...", email);
            List<UserRepresentation> existingUsers = usersResource.search(email, true);
            if (!existingUsers.isEmpty()) {
                return existingUsers.get(0).getId();
            }
            throw new RuntimeException("Conflit Keycloak mais utilisateur non trouvé par email");
        } else {
            String error = response.readEntity(String.class);
            log.error("Erreur lors de la création de l'utilisateur Keycloak : {} - {}", response.getStatus(), error);
            throw new RuntimeException("Impossible de créer le compte Keycloak : " + error);
        }
    }

    private void assignRole(UsersResource usersResource, String userId, String roleName) {
        try {
            usersResource.get(userId).roles().realmLevel().add(
                Collections.singletonList(
                    usersResource.get(userId).roles().realmLevel().listAvailable().stream()
                        .filter(r -> r.getName().equals(roleName))
                        .findFirst()
                        .orElseThrow(() -> new RuntimeException("Rôle " + roleName + " non trouvé dans Keycloak"))
                )
            );
            log.info("Rôle '{}' assigné à l'utilisateur ID: {}", roleName, userId);
        } catch (Exception e) {
            log.warn("Erreur lors de l'assignation du rôle : {}", e.getMessage());
        }
    }
}

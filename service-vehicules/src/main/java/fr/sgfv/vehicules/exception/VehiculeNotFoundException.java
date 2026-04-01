package fr.sgfv.vehicules.exception;

import java.util.UUID;

public class VehiculeNotFoundException extends RuntimeException {
    public VehiculeNotFoundException(UUID id) {
        super("Aucun véhicule trouvé avec l'id " + id);
    }
}
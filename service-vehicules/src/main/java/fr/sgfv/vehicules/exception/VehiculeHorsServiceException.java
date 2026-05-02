package fr.sgfv.vehicules.exception;

public class VehiculeHorsServiceException extends RuntimeException {
    public VehiculeHorsServiceException() {
        super("Un véhicule HORS_SERVICE ne peut plus être modifié");
    }
}
package fr.sgfv.vehicules.exception;

public class PlaqueDejaExistanteException extends RuntimeException {
    public PlaqueDejaExistanteException(String plaque) {
        super("Un véhicule avec la plaque " + plaque + " existe déjà");
    }
}
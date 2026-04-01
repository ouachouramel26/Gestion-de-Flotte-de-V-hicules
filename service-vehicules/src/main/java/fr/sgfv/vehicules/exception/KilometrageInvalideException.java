package fr.sgfv.vehicules.exception;

public class KilometrageInvalideException extends RuntimeException {
    public KilometrageInvalideException(int actuel, int recu) {
        super("Le kilométrage ne peut pas diminuer (actuel: " + actuel + ", reçu: " + recu + ")");
    }
}
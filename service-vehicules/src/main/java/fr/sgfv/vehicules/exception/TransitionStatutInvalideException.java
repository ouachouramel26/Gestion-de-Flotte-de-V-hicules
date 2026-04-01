package fr.sgfv.vehicules.exception;

public class TransitionStatutInvalideException extends RuntimeException {
    public TransitionStatutInvalideException(String de, String vers) {
        super("Transition invalide : " + de + " → " + vers + " non autorisée");
    }
}
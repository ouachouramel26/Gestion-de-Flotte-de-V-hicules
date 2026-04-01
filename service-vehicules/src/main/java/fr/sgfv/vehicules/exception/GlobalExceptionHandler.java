package fr.sgfv.vehicules.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(VehiculeNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(VehiculeNotFoundException ex) {
        return error(HttpStatus.NOT_FOUND, "VEHICULE_INTROUVABLE", ex.getMessage());
    }

    @ExceptionHandler(PlaqueDejaExistanteException.class)
    public ResponseEntity<Map<String, Object>> handlePlaque(PlaqueDejaExistanteException ex) {
        return error(HttpStatus.CONFLICT, "PLAQUE_DEJA_EXISTANTE", ex.getMessage());
    }

    @ExceptionHandler(VehiculeHorsServiceException.class)
    public ResponseEntity<Map<String, Object>> handleHorsService(VehiculeHorsServiceException ex) {
        return error(HttpStatus.FORBIDDEN, "VEHICULE_HORS_SERVICE", ex.getMessage());
    }

    @ExceptionHandler(KilometrageInvalideException.class)
    public ResponseEntity<Map<String, Object>> handleKm(KilometrageInvalideException ex) {
        return error(HttpStatus.BAD_REQUEST, "KILOMETRAGE_INVALIDE", ex.getMessage());
    }

    @ExceptionHandler(TransitionStatutInvalideException.class)
    public ResponseEntity<Map<String, Object>> handleTransition(TransitionStatutInvalideException ex) {
        return error(HttpStatus.BAD_REQUEST, "TRANSITION_INVALIDE", ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors()
            .stream().findFirst()
            .map(e -> e.getDefaultMessage())
            .orElse("Données invalides");
        return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", message);
    }

    private ResponseEntity<Map<String, Object>> error(HttpStatus status, String code, String message) {
        return ResponseEntity.status(status).body(Map.of(
            "code", code,
            "message", message,
            "timestamp", LocalDateTime.now().toString()
        ));
    }
}
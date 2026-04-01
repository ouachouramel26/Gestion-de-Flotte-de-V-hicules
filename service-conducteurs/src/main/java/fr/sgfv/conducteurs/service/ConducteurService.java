package fr.sgfv.conducteurs.service;

import fr.sgfv.conducteurs.entity.Conducteur;
import fr.sgfv.conducteurs.dto.ConducteurDto;
import fr.sgfv.conducteurs.kafka.ConducteurKafkaProducer;
import fr.sgfv.conducteurs.repository.ConducteurRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ConducteurService {

    private final ConducteurRepository conducteurRepository;
    private final ConducteurKafkaProducer kafkaPublisher;

    @Transactional(readOnly = true)
    public List<ConducteurDto> getAllConducteurs() {
        return conducteurRepository.findAll()
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ConducteurDto getConducteurById(Long id) {
        Conducteur conducteur = conducteurRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Conducteur introuvable"));
        return mapToDto(conducteur);
    }

    @Transactional
    public ConducteurDto createConducteur(ConducteurDto dto) {
        if (conducteurRepository.findByNumeroPermis(dto.getNumeroPermis()).isPresent()) {
            throw new RuntimeException("Un conducteur avec ce permis existe déjà");
        }

        Conducteur conducteur = Conducteur.builder()
                .nom(dto.getNom())
                .prenom(dto.getPrenom())
                .numeroPermis(dto.getNumeroPermis())
                .typePermis(dto.getTypePermis())
                .dateExpirationPermis(dto.getDateExpirationPermis())
                .statut(dto.getStatut() != null ? dto.getStatut() : fr.sgfv.conducteurs.entity.ConducteurStatut.ACTIF)
                .build();

        Conducteur savedConducteur = conducteurRepository.save(conducteur);
        
        kafkaPublisher.publishConducteurCreated(savedConducteur.getId());
        
        return mapToDto(savedConducteur);
    }

    private ConducteurDto mapToDto(Conducteur conducteur) {
        return ConducteurDto.builder()
                .id(conducteur.getId())
                .nom(conducteur.getNom())
                .prenom(conducteur.getPrenom())
                .numeroPermis(conducteur.getNumeroPermis())
                .typePermis(conducteur.getTypePermis())
                .dateExpirationPermis(conducteur.getDateExpirationPermis())
                .statut(conducteur.getStatut())
                .build();
    }
}

package fr.sgfv.maintenance.service;

import fr.sgfv.maintenance.dto.TechnicienDto;
import fr.sgfv.maintenance.entity.Technicien;
import fr.sgfv.maintenance.entity.TechnicienDisponibilite;
import fr.sgfv.maintenance.repository.TechnicienRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TechnicienService {

    private final TechnicienRepository technicienRepository;

    @Transactional(readOnly = true)
    public List<TechnicienDto> getAll() {
        return technicienRepository.findAll().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public TechnicienDto getById(UUID id) {
        return technicienRepository.findById(id)
                .map(this::mapToDto)
                .orElseThrow(() -> new RuntimeException("Technicien introuvable"));
    }

    @Transactional
    public TechnicienDto create(TechnicienDto dto) {
        Technicien technicien = Technicien.builder()
                .id(dto.getId() != null ? dto.getId() : UUID.randomUUID())
                .keycloakId(dto.getKeycloakId() != null ? dto.getKeycloakId() : UUID.randomUUID().toString())
                .nom(dto.getNom())
                .prenom(dto.getPrenom())
                .email(dto.getEmail())
                .telephone(dto.getTelephone())
                .disponibilite(dto.getDisponibilite() != null ? dto.getDisponibilite() : TechnicienDisponibilite.DISPONIBLE)
                .build();
        
        return mapToDto(technicienRepository.save(technicien));
    }

    @Transactional
    public TechnicienDto update(UUID id, TechnicienDto dto) {
        Technicien technicien = technicienRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Technicien introuvable"));
        
        technicien.setNom(dto.getNom());
        technicien.setPrenom(dto.getPrenom());
        technicien.setEmail(dto.getEmail());
        technicien.setTelephone(dto.getTelephone());
        if (dto.getDisponibilite() != null) {
            technicien.setDisponibilite(dto.getDisponibilite());
        }
        
        return mapToDto(technicienRepository.save(technicien));
    }

    @Transactional
    public void delete(UUID id) {
        technicienRepository.deleteById(id);
    }

    private TechnicienDto mapToDto(Technicien t) {
        return TechnicienDto.builder()
                .id(t.getId())
                .keycloakId(t.getKeycloakId())
                .nom(t.getNom())
                .prenom(t.getPrenom())
                .email(t.getEmail())
                .telephone(t.getTelephone())
                .disponibilite(t.getDisponibilite())
                .build();
    }
}

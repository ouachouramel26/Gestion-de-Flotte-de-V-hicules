package fr.sgfv.vehicules.controller;

import fr.sgfv.vehicules.dto.*;
import fr.sgfv.vehicules.service.VehiculeService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(VehiculeController.class)
@WithMockUser // To bypass security if enabled
class VehiculeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private VehiculeService vehiculeService;

    @Test
    void testAssigner() throws Exception {
        UUID id = UUID.randomUUID();
        UUID conducteurId = UUID.randomUUID();

        when(vehiculeService.assignerConducteur(eq(id), any())).thenReturn(VehiculeDTO.builder().build());

        mockMvc.perform(patch("/vehicules/" + id + "/assigner")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"conducteurId\":\"" + conducteurId + "\"}"))
                .andExpect(status().isOk());
    }
}

import {
    createInitialScenario,
    syncIdCounterWithScenario,
    createEmptyComboStarter,
} from "@/utils/scenario-utils";
import { validateScenario, type ValidationError } from "@/utils/validation";
import type { Scenario } from "@nomari/ts-proto";
import { defineStore } from "pinia";

export const useScenarioStore = defineStore('scenario', {
    state: () => ({
        scenario: createInitialScenario(),
        validationErrors: [] as ValidationError[],
        showValidationErrors: false,
        /**
         * Version number that increments when scenario changes.
         * Used to detect if game tree needs to be rebuilt.
         */
        scenarioVersion: 0,
    }),
    getters: {
        hasValidationErrors: (state) => state.validationErrors.length > 0
    },
    actions: {
        /**
         * Increment the scenario version.
         * Call this when scenario is modified.
         */
        incrementVersion() {
            this.scenarioVersion++;
        },
        /**
         * Load a Scenario (e.g., from JSON import)
         * This also syncs the ID counter to prevent ID collisions
         */
        loadScenario(scenario: Scenario) {
            this.scenario = scenario;
            syncIdCounterWithScenario(scenario);
            this.validationErrors = [];
            this.showValidationErrors = false;
        },
        /**
         * Validate the scenario and show errors if any.
         * Returns true if validation passed (no errors).
         */
        validateAndShowErrors(): boolean {
            this.validationErrors = validateScenario(this.scenario);
            this.showValidationErrors = this.validationErrors.length > 0;
            return this.validationErrors.length === 0;
        },
        /**
         * Close the validation errors panel.
         */
        closeValidationErrors() {
            this.showValidationErrors = false;
        },
        /**
         * Add a new player combo starter
         */
        addPlayerComboStarter() {
            const comboStarter = createEmptyComboStarter();
            this.scenario.playerComboStarters.push(comboStarter);
            return comboStarter;
        },
        /**
         * Remove a player combo starter by situation ID
         */
        removePlayerComboStarter(situationId: number) {
            const index = this.scenario.playerComboStarters.findIndex(
                cs => cs.situationId === situationId
            );
            if (index !== -1) {
                this.scenario.playerComboStarters.splice(index, 1);
            }
        },
        /**
         * Add a new opponent combo starter
         */
        addOpponentComboStarter() {
            const comboStarter = createEmptyComboStarter();
            this.scenario.opponentComboStarters.push(comboStarter);
            return comboStarter;
        },
        /**
         * Remove an opponent combo starter by situation ID
         */
        removeOpponentComboStarter(situationId: number) {
            const index = this.scenario.opponentComboStarters.findIndex(
                cs => cs.situationId === situationId
            );
            if (index !== -1) {
                this.scenario.opponentComboStarters.splice(index, 1);
            }
        },
    },
});

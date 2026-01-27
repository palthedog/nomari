import {
    createInitialGameDefinition,
    syncIdCounterWithGameDefinition,
    createEmptyComboStarter,
} from "@/utils/game-definition-utils";
import { validateGameDefinition, type ValidationError } from "@/utils/validation";
import type { GameDefinition } from "@nomari/ts-proto";
import { defineStore } from "pinia";

export const useDefinitionStore = defineStore('definition', {
    state: () => ({
        gameDefinition: createInitialGameDefinition(),
        validationErrors: [] as ValidationError[],
        showValidationErrors: false,
        /**
         * Version number that increments when gameDefinition changes.
         * Used to detect if game tree needs to be rebuilt.
         */
        definitionVersion: 0,
    }),
    getters: {
        hasValidationErrors: (state) => state.validationErrors.length > 0
    },
    actions: {
        /**
         * Increment the definition version.
         * Call this when gameDefinition is modified.
         */
        incrementVersion() {
            this.definitionVersion++;
        },
        /**
         * Load a GameDefinition (e.g., from JSON import)
         * This also syncs the ID counter to prevent ID collisions
         */
        loadGameDefinition(gameDefinition: GameDefinition) {
            this.gameDefinition = gameDefinition;
            syncIdCounterWithGameDefinition(gameDefinition);
            this.validationErrors = [];
            this.showValidationErrors = false;
        },
        /**
         * Validate the game definition and show errors if any.
         * Returns true if validation passed (no errors).
         */
        validateAndShowErrors(): boolean {
            this.validationErrors = validateGameDefinition(this.gameDefinition);
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
            this.gameDefinition.playerComboStarters.push(comboStarter);
            return comboStarter;
        },
        /**
         * Remove a player combo starter by situation ID
         */
        removePlayerComboStarter(situationId: number) {
            const index = this.gameDefinition.playerComboStarters.findIndex(
                cs => cs.situationId === situationId
            );
            if (index !== -1) {
                this.gameDefinition.playerComboStarters.splice(index, 1);
            }
        },
        /**
         * Add a new opponent combo starter
         */
        addOpponentComboStarter() {
            const comboStarter = createEmptyComboStarter();
            this.gameDefinition.opponentComboStarters.push(comboStarter);
            return comboStarter;
        },
        /**
         * Remove an opponent combo starter by situation ID
         */
        removeOpponentComboStarter(situationId: number) {
            const index = this.gameDefinition.opponentComboStarters.findIndex(
                cs => cs.situationId === situationId
            );
            if (index !== -1) {
                this.gameDefinition.opponentComboStarters.splice(index, 1);
            }
        },
    },
});

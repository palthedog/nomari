import {
    createInitialGameDefinition,
    syncIdCounterWithGameDefinition,
} from "@/utils/game-definition-utils";
import { validateGameDefinition, type ValidationError } from "@/utils/validation";
import type { GameDefinition } from "@mari/ts-proto";
import { defineStore } from "pinia";

export const useDefinitionStore = defineStore('definition', {
    state: () => ({
        gameDefinition: createInitialGameDefinition(),
        validationErrors: [] as ValidationError[],
        showValidationErrors: false,
    }),
    getters: {
        hasValidationErrors: (state) => state.validationErrors.length > 0,
    },
    actions: {
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
    },
});

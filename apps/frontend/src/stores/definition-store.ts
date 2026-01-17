import { createInitialGameDefinition } from "@/utils/game-definition-utils";
import { defineStore } from "pinia";

export const useDefinitionStore = defineStore('definition', {
    state: () => ({
        gameDefinition: createInitialGameDefinition()
    }),
    getters: {
    },
    actions: {
    },
});

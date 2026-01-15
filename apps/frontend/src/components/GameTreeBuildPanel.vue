<template>
    <div class="game-tree-build-panel">
        <div class="panel-header">
            <h3>ゲーム木構築設定</h3>
        </div>
        <div class="panel-content">
            <InitialDynamicStateEditor
                v-if="gameDefinition.initialDynamicState"
                v-model="gameDefinition.initialDynamicState" />

            <RewardComputationMethodEditor
                v-model="gameDefinition.rewardComputationMethod" />

            <div class="update-button-section">
                <button type="button" class="update-tree-btn" @click="handleUpdate">
                    ゲーム木を更新
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { defineModel } from 'vue';
import type { GameDefinition } from '@mari/ts-proto';
import InitialDynamicStateEditor from './InitialDynamicStateEditor.vue';
import RewardComputationMethodEditor from './RewardComputationMethodEditor.vue';

const gameDefinition = defineModel<GameDefinition>({ required: true });

const emit = defineEmits<{
    update: [];
}>();

function handleUpdate() {
    emit('update');
}
</script>

<style scoped>
.game-tree-build-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    border-right: 1px solid #ddd;
    background-color: #f9f9f9;
}

.panel-header {
    padding: 15px;
    background-color: #fff;
    border-bottom: 1px solid #ddd;
}

.panel-header h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 500;
}

.panel-content {
    flex: 1;
    overflow-y: auto;
    padding: 15px;
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.update-button-section {
    margin-top: auto;
    padding-top: 15px;
    border-top: 1px solid #ddd;
}

.update-tree-btn {
    width: 100%;
    padding: 12px 16px;
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    font-size: 14px;
    transition: background-color 0.2s;
}

.update-tree-btn:hover {
    background-color: #45a049;
}

.update-tree-btn:active {
    background-color: #3d8b40;
}
</style>

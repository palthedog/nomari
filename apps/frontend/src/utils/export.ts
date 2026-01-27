import { GameDefinition } from '@nomari/ts-proto';

function exportAsFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Export GameDefinition as JSON
 */
export function exportAsJSON(gameDefinition: GameDefinition, filename: string): void {
    const json = GameDefinition.toJsonString(gameDefinition);
    const blob = new Blob([json], { type: 'application/json' });
    exportAsFile(blob, filename);
}

/**
 * Export GameDefinition as Proto
 */
export function exportAsProto(gameDefinition: GameDefinition, filename: string): void {
    const encodedProto: Uint8Array = GameDefinition.toBinary(gameDefinition);
    const blob = new Blob([encodedProto as Uint8Array<ArrayBuffer>]);

    exportAsFile(blob, filename);
}

// ============================================================
// Import functions
// ============================================================

/**
 * Open a file selection dialog and return the selected file
 * Returns null if the user cancels the dialog
 */
function selectFile(accept: string): Promise<File | null> {
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = accept;
        input.onchange = () => {
            const file = input.files?.[0] ?? null;
            resolve(file);
        };
        input.oncancel = () => resolve(null);
        input.click();
    });
}

/**
 * Import GameDefinition from JSON file content
 */
function parseAsJSON(text: string): GameDefinition {
    return GameDefinition.fromJsonString(text);
}

/**
 * Import GameDefinition from Proto binary content
 */
export function parseAsProto(buffer: ArrayBuffer): GameDefinition {
    return GameDefinition.fromBinary(new Uint8Array(buffer));
}

/**
 * Import GameDefinition from a file (.json or .pb)
 * Returns null if the user cancels the file selection dialog
 * Throws an error if the file format is not supported or parsing fails
 */
export async function importGameDefinition(): Promise<GameDefinition | null> {
    const file = await selectFile('.json,.pb');
    if (!file) {
        return null;
    }

    if (file.name.endsWith('.json')) {
        const text = await file.text();
        return parseAsJSON(text);
    }

    if (file.name.endsWith('.pb')) {
        const buffer = await file.arrayBuffer();
        return parseAsProto(buffer);
    }

    throw new Error('Unsupported file format. Please select a .json or .pb file.');
}

import { GameDefinition } from '@mari/ts-proto';

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
    const json = JSON.stringify(gameDefinition, null, 2);
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

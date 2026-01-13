import type { GameDefinition } from '@mari/ts-proto';

/**
 * Export GameDefinition as JSON
 */
export function exportAsJSON(gameDefinition: GameDefinition, filename: string = 'gamedefinition.json'): void {
    const json = JSON.stringify(gameDefinition, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
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
 * Export GameDefinition as Protocol Buffer (future implementation)
 * For now, this is a placeholder
 */
export function exportAsProto(_gameDefinition: GameDefinition, _filename: string = 'gamedefinition.proto'): void {
    // TODO: Implement protocol buffer encoding
    // This would require protobuf-js or similar library
    console.warn('Protocol Buffer export is not yet implemented');
}

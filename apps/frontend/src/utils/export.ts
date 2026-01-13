import { GameTree } from '@mari/game-tree/game-tree';

/**
 * Export GameTree as JSON
 */
export function exportAsJSON(gameTree: GameTree, filename: string = 'gametree.json'): void {
    const json = JSON.stringify(gameTree, null, 2);
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
 * Export GameTree as Protocol Buffer (future implementation)
 * For now, this is a placeholder
 */
export function exportAsProto(_gameTree: GameTree, _filename: string = 'gametree.proto'): void {
    // TODO: Implement protocol buffer encoding
    // This would require protobuf-js or similar library
    console.warn('Protocol Buffer export is not yet implemented');
}

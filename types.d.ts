
// FIX: Reverting this file to a global script (by removing the import statement)
// allows it to augment React's global JSX types instead of overwriting them.
// This fixes errors for all standard HTML elements (div, p, etc.) across the app.
declare namespace JSX {
    interface IntrinsicElements {
        'model-viewer': any;
    }
}

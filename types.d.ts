/// <reference types="react" />

// By making this file a module (via the import statement) and using `declare global`,
// we can augment the global `JSX.IntrinsicElements` interface.
// This allows TypeScript to recognize the custom <model-viewer> element in JSX.
// A regular `import` is used instead of `import type` to ensure
// that React's base types are loaded before this augmentation is applied,
// preventing the original `IntrinsicElements` from being overwritten.
//
// UPDATE: To fix issues with base JSX types not being found, this file is being
// converted to a global script by removing the import.

// FIX: Removed `import` and `declare global` to treat this as a global script
// and prevent module scoping issues with JSX type augmentation.
namespace JSX {
  interface IntrinsicElements {
    'model-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
      src?: string;
      alt?: string;
      'camera-controls'?: boolean;
      'auto-rotate'?: boolean;
      ar?: boolean;
      'ar-modes'?: string;
      'shadow-intensity'?: string;
      style?: React.CSSProperties;
    }, HTMLElement>;
  }
}

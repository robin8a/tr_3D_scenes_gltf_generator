// Fix: Replaced `import` with a triple-slash `reference` directive. This ensures
// this file is treated as a global script, allowing the `JSX.IntrinsicElements`
// interface to be correctly augmented rather than being replaced. This resolves
// errors where standard HTML elements were not recognized in TSX files.
/// <reference types="react" />

declare global {
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
}

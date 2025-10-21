// FIX: By turning this file into a module (with `export {}`) and using `declare global`,
// we can correctly augment the global JSX namespace instead of overwriting it.
// This fixes errors for all standard HTML elements (div, p, etc.) across the app
// while still providing a type for the custom <model-viewer> element.
export {};

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string | null;
          alt?: string;
          ar?: boolean;
          'ar-modes'?: string;
          'camera-controls'?: boolean;
          'auto-rotate'?: boolean;
          'shadow-intensity'?: string;
        },
        HTMLElement
      >;
    }
  }
}

// This file augments the global JSX namespace to add the custom element <model-viewer>.
// By treating this as a global declaration file (no top-level export), we ensure it merges
// with the existing global JSX namespace rather than replacing it.

declare namespace JSX {
  interface IntrinsicElements {
    'model-viewer': import('react').DetailedHTMLProps<
      import('react').HTMLAttributes<HTMLElement> & {
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

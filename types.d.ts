// FIX: To augment the global JSX namespace, this file must be a module.
// Importing 'react' achieves this and also loads the necessary React types,
// resolving the errors related to global augmentation and missing namespaces.
import 'react';

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

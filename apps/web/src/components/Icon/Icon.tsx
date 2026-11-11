import styles from './Icon.module.css';

/** The icons of the interface: inline SVG (24 px grid, 2 px stroke), never an emoji. */
const PATHS = {
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM21 21l-4.3-4.3',
  close: 'M6 6l12 12M18 6 6 18',
  back: 'M19 12H5M11 6l-6 6 6 6',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  download: 'M12 4v11M7 11l5 5 5-5M5 20h14',
  check: 'M5 12.5 10 17.5 19 7',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 7v5l3 2',
  document: 'M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM14 3v5h5M9 13h6M9 17h6',
  home: 'M3 11.5 12 4l9 7.5M5 10v10h5v-6h4v6h5V10',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z',
  chevron: 'M6 9l6 6 6-6',
  sparkle: 'M11 3l1.9 5.6L18.5 10.5l-5.6 1.9L11 18l-1.9-5.6L3.5 10.5l5.6-1.9L11 3ZM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z',
  folder: 'M3 7a1 1 0 0 1 1-1h5l2 2h8a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7Z',
} as const;

/** The name of an icon of {@link Icon}. */
export type IconName = keyof typeof PATHS;

interface IconProps {
  readonly name: IconName;
  /** The back arrow points the other way in a right-to-left page. */
  readonly mirrorInRtl?: boolean;
  readonly className?: string;
}

/** A decorative icon: hidden from screen readers (the button or link around it carries the text). */
export function Icon({ name, mirrorInRtl = false, className }: IconProps) {
  const classes: string = [styles.icon, mirrorInRtl ? styles.mirror : '', className ?? ''].filter(Boolean).join(' ');
  return (
    <svg className={classes} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={PATHS[name]} />
    </svg>
  );
}

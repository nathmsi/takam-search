import styles from './HeroArt.module.css';

const FOLDER_PATH = 'M0 7a7 7 0 0 1 7-7h15l7 9h34a7 7 0 0 1 7 7v32a7 7 0 0 1-7 7H7a7 7 0 0 1-7-7Z';
const FOLDERS: ReadonlyArray<readonly [number, number]> = [
  [44, 36],
  [112, 36],
  [44, 98],
  [112, 98],
];
const PAGES: readonly number[] = [0, 1, 2];

/**
 * A drawing for the welcome panel: a screen with folders and pages, and a magnifier over it. Our own, plain and flat; it
 * carries no meaning (the panel's text does), so it is hidden from screen readers.
 */
export function HeroArt() {
  return (
    <svg className={styles.art} viewBox="0 0 400 270" aria-hidden="true" focusable="false">
      <rect className={styles.frame} x="14" y="8" width="320" height="200" rx="12" />
      <rect className={styles.screen} x="26" y="20" width="296" height="176" rx="6" />
      {FOLDERS.map(([x, y]) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
          <path className={styles.folderBack} d={FOLDER_PATH} />
          <rect className={styles.folder} x="0" y="12" width="70" height="46" rx="7" />
        </g>
      ))}
      {PAGES.flatMap((column) =>
        PAGES.slice(0, 2).map((row) => (
          <g key={`${column}-${row}`} transform={`translate(${196 + column * 38} ${40 + row * 62})`}>
            <rect className={styles.paper} width="30" height="46" rx="3" />
            <rect className={styles.line} x="5" y="9" width="20" height="3" rx="1.5" />
            <rect className={styles.line} x="5" y="17" width="20" height="3" rx="1.5" />
            <rect className={styles.line} x="5" y="25" width="14" height="3" rx="1.5" />
          </g>
        )),
      )}
      <rect className={styles.frame} x="150" y="208" width="48" height="34" />
      <rect className={styles.frame} x="106" y="240" width="136" height="12" rx="6" />
      <circle className={styles.lens} cx="268" cy="136" r="52" />
      <path className={styles.handle} d="M305 175l50 50" />
    </svg>
  );
}

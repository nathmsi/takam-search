import styles from './StateMessage.module.css';

interface StateMessageProps {
  /** `error` is announced at once to screen readers; `empty` politely. */
  readonly kind: 'empty' | 'error';
  readonly title: string;
  readonly hint: string;
  readonly action?: { readonly label: string; readonly onClick: () => void };
}

/** A screen state that is not a list: nothing found, or something failed. It always says what to do next. */
export function StateMessage({ kind, title, hint, action }: StateMessageProps) {
  return (
    <div className={`${styles.box} ${kind === 'error' ? styles.error : ''}`} role={kind === 'error' ? 'alert' : 'status'}>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.hint}>{hint}</p>
      {action ? (
        <button type="button" className={styles.action} onClick={action.onClick}>
          {action.label}
        </button>
      ) : null}
    </div>
  );
}

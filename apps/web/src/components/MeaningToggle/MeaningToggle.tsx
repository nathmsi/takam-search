import { useMatch, useSearchParams } from 'react-router';
import { messages } from '../../i18n/messages';
import { Icon } from '../Icon/Icon';
import styles from './MeaningToggle.module.css';

/**
 * The small button of the header that turns the search by meaning (an experiment) on and off. It only exists on the search
 * pages, where it sets `?meaning=yes` in the address (the page reads it from there, so it can be shared). It is icon only, on
 * purpose: its name is read by screen readers and shown on hover, and the list says when the results come from the meaning.
 */
export function MeaningToggle() {
  const isSearchPage: boolean = useMatch('/documents/*') !== null;
  const [searchParams, setSearchParams] = useSearchParams();
  if (!isSearchPage) return null;
  const isOn: boolean = searchParams.get('meaning') === 'yes';
  const toggle = (): void => {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (isOn) next.delete('meaning');
        else next.set('meaning', 'yes');
        return next;
      },
      { replace: true },
    );
  };
  return (
    <button type="button" className={`${styles.button} ${isOn ? styles.on : ''}`} aria-pressed={isOn} aria-label={messages.filterMeaning} title={messages.filterMeaning} onClick={toggle}>
      <Icon name="sparkle" />
    </button>
  );
}

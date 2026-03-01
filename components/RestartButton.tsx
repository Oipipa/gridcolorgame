import styles from "@/components/RestartButton.module.css";

interface RestartButtonProps {
  onRestart: () => void;
}

export function RestartButton({ onRestart }: RestartButtonProps) {
  return (
    <button className={styles.button} type="button" onClick={onRestart}>
      Restart
    </button>
  );
}

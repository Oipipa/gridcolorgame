"use client";

import styles from "@/components/UsernameBar.module.css";

interface UsernameBarProps {
  username: string;
  onClick: () => void;
  disabled?: boolean;
}

export function UsernameBar({ username, onClick, disabled = false }: UsernameBarProps) {
  return (
    <button
      type="button"
      className={styles.button}
      onClick={onClick}
      disabled={disabled}
      aria-label="Change username"
    >
      {username || "Set username"}
    </button>
  );
}

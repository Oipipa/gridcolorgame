"use client";

import { FormEvent } from "react";
import styles from "@/components/UsernamePrompt.module.css";

interface UsernamePromptProps {
  value: string;
  errorMessage: string;
  minLength: number;
  maxLength: number;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function UsernamePrompt({
  value,
  errorMessage,
  minLength,
  maxLength,
  onChange,
  onSubmit,
}: UsernamePromptProps) {
  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="username-title">
      <form className={styles.form} onSubmit={onSubmit}>
        <h2 className={styles.title} id="username-title">
          Enter Username
        </h2>

        <p className={styles.helper}>This name is used for your high score.</p>

        <input
          className={styles.input}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Username"
          minLength={minLength}
          maxLength={maxLength}
          autoFocus
          required
        />

        {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}

        <button className={styles.button} type="submit">
          Continue
        </button>
      </form>
    </div>
  );
}

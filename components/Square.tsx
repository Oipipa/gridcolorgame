import { ClickOutcome } from "@/lib/types";
import styles from "@/components/Square.module.css";

interface SquareProps {
  color: string;
  disabled: boolean;
  isClicked: boolean;
  isGameOver: boolean;
  isOdd: boolean;
  clickOutcome: ClickOutcome;
  squareRef?: (node: HTMLButtonElement | null) => void;
  onClick: () => void;
}

const classNames = (...classes: Array<string | false>): string => {
  return classes.filter(Boolean).join(" ");
};

export function Square({
  color,
  disabled,
  isClicked,
  isGameOver,
  isOdd,
  clickOutcome,
  squareRef,
  onClick,
}: SquareProps) {
  const outcomeClass =
    isClicked && clickOutcome === "correct"
      ? styles.correct
      : isClicked && clickOutcome === "wrong"
        ? styles.wrong
        : "";

  return (
    <button
      ref={squareRef}
      type="button"
      aria-label="Grid color tile"
      className={classNames(
        styles.square,
        outcomeClass,
        isOdd && isGameOver && styles.oddOnGameOver,
        disabled && styles.disabled,
      )}
      onClick={onClick}
      disabled={disabled}
      style={{ backgroundColor: color }}
    />
  );
}

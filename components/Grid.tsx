import { useLayoutEffect, useRef } from "react";
import { ClickOutcome, GameStatus } from "@/lib/types";
import { Square } from "@/components/Square";
import styles from "@/components/Grid.module.css";

interface GridProps {
  size: number;
  tileOrder: number[];
  baseColor: string;
  oddColor: string;
  oddIndex: number;
  gameStatus: GameStatus;
  clickedIndex: number | null;
  clickOutcome: ClickOutcome;
  disabled: boolean;
  isWobbling: boolean;
  isLevelTransitioning: boolean;
  onSquareClick: (index: number) => void;
}

const GAP_BY_SIZE: Record<number, number> = {
  2: 14,
  3: 12,
  4: 10,
  5: 9,
  6: 8,
};

export function Grid({
  size,
  tileOrder,
  baseColor,
  oddColor,
  oddIndex,
  gameStatus,
  clickedIndex,
  clickOutcome,
  disabled,
  isWobbling,
  isLevelTransitioning,
  onSquareClick,
}: GridProps) {
  const gap = GAP_BY_SIZE[size] ?? 10;
  const shellClass = isWobbling ? `${styles.shell} ${styles.wobble}` : styles.shell;
  const gridClass = isLevelTransitioning ? `${styles.grid} ${styles.levelTransition}` : styles.grid;

  const tileRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const previousRectsRef = useRef<Map<number, DOMRect>>(new Map());

  useLayoutEffect(() => {
    const nextRects = new Map<number, DOMRect>();

    tileOrder.forEach((tileId) => {
      const tileNode = tileRefs.current.get(tileId);

      if (!tileNode) {
        return;
      }

      nextRects.set(tileId, tileNode.getBoundingClientRect());
    });

    const previousRects = previousRectsRef.current;

    nextRects.forEach((nextRect, tileId) => {
      const previousRect = previousRects.get(tileId);

      if (!previousRect) {
        return;
      }

      const deltaX = previousRect.left - nextRect.left;
      const deltaY = previousRect.top - nextRect.top;

      if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) {
        return;
      }

      const tileNode = tileRefs.current.get(tileId);

      if (!tileNode) {
        return;
      }

      tileNode.style.transition = "none";
      tileNode.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
      void tileNode.offsetWidth;
      tileNode.style.transition = "transform 320ms cubic-bezier(0.22, 0.8, 0.2, 1)";
      tileNode.style.transform = "";

      const cleanup = () => {
        tileNode.style.transition = "";
        tileNode.removeEventListener("transitionend", cleanup);
      };

      tileNode.addEventListener("transitionend", cleanup);
    });

    previousRectsRef.current = nextRects;
  }, [tileOrder]);

  return (
    <div className={shellClass}>
      <div
        className={gridClass}
        style={{
          gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
          gap: `${gap}px`,
        }}
      >
        {tileOrder.map((tileId, positionIndex) => {
          const isOdd = tileId === oddIndex;

          return (
            <Square
              key={tileId}
              squareRef={(node) => {
                if (node) {
                  tileRefs.current.set(tileId, node);
                  return;
                }

                tileRefs.current.delete(tileId);
              }}
              color={isOdd ? oddColor : baseColor}
              disabled={disabled}
              isClicked={clickedIndex === positionIndex}
              isGameOver={gameStatus === "gameover"}
              isOdd={isOdd}
              clickOutcome={clickOutcome}
              onClick={() => onSquareClick(positionIndex)}
            />
          );
        })}
      </div>
    </div>
  );
}

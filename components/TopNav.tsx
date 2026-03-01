"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "@/components/TopNav.module.css";

const getLinkClassName = (isActive: boolean): string => {
  return isActive ? `${styles.link} ${styles.active}` : styles.link;
};

export function TopNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="Primary">
      <Link href="/" className={getLinkClassName(pathname === "/")}>Home</Link>
      <Link href="/leaderboard" className={getLinkClassName(pathname === "/leaderboard")}>Leaderboard</Link>
    </nav>
  );
}

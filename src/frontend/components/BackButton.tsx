"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeftIcon } from "@/frontend/components/icons";

interface BackButtonProps {

  href?: string;
  label?: string;
  className?: string;
}

export function BackButton({ href, label = "Back", className = "" }: BackButtonProps) {
  const router = useRouter();
  const classes = `flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface-hover ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes} aria-label={label} title={label}>
        <ChevronLeftIcon size={20} />
      </Link>
    );
  }

  return (
    <button type="button" className={classes} onClick={() => router.back()} aria-label={label} title={label}>
      <ChevronLeftIcon size={20} />
    </button>
  );
}

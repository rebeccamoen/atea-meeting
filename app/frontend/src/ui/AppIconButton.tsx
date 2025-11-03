import { ButtonHTMLAttributes, forwardRef } from "react";
import cls from "classnames";
import styles from "./AppIconButton.module.css";
import { AppIcon } from "./AppIcon";

type Size = "sm" | "md" | "lg";
type Variant = "default" | "muted" | "accent" | "danger";
type Slot = "sidebar" | "toolbar" | "inline";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  icon: Parameters<typeof AppIcon>[0]["name"] | { fluent: string };
  size?: Size;
  variant?: Variant;
  spinning?: boolean;
  iconSize?: number;
  title?: string;
  slot?: Slot;
};

export const AppIconButton = forwardRef<HTMLButtonElement, Props>(
  ({ icon, size = "md", variant = "default", className, iconSize, slot, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        className={cls(
          styles.root,
          styles[`size-${size}`],
          styles[`variant-${variant}`],
          slot && styles[`${slot}Scope`],
          className
        )}
        {...rest}
      >
        <AppIcon name={icon as any} aria-hidden {...(iconSize ? { size: iconSize } : {})} />
      </button>
    );
  }
);
AppIconButton.displayName = "AppIconButton";

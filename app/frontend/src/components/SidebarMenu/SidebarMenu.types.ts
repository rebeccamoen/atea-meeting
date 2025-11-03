import type { ReactNode } from "react";
import type { AppIconName } from "../../ui/AppIcon";

export type SidebarMode = "push" | "overlay";

export type SidebarMenuItem = {
  key: string;
  label: string;
  size: string;
  icon: AppIconName;
  onClick: () => void;
  disabled?: boolean;
  show?: boolean;
};

export type SidebarMenuProps = {
  items: SidebarMenuItem[];
  footerExpanded?: ReactNode;
  footerCollapsed?: ReactNode;

  historyList?: ReactNode;

  logo?: ReactNode;

  open?: boolean;
  onOpenChange?: (open: boolean) => void;

  mode?: SidebarMode;

  responsive?: boolean;
  breakpointPx?: number;

  defaultOpen?: boolean;

  ariaLabelHide?: string;
  ariaLabelShow?: string;

  hideInlineHamburger?: boolean;
};

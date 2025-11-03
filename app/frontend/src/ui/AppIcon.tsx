import { memo } from "react";
import { Icon } from "@fluentui/react";
import {
    SquarePen,
    Settings,
    Volume2 as Volume,
    CircleStop,
    Loader,
    Copy,
    Check,
    ThumbsUp,
    ThumbsDown,
    Download,
    Lightbulb,
    ClipboardList,
    Delete as Delete,
    X as Cancel,
    UserRound as User,
    LogIn as Signin,
    House,
    PanelLeft,
    BookOpenText,
    Send,
    Files,
    CircleArrowUp as ArrowUp
} from "lucide-react";
import clsx from "classnames";

const map = {
    // sidebar/common
    home: House,
    clear: SquarePen,
    delete: Delete,
    upload: Files,
    info: BookOpenText,
    feedback: Send,
    settings: Settings,
    cancel: Cancel,
    user: User,
    signin: Signin,
    panelLeft: PanelLeft,
    send: ArrowUp,

    // answer toolbar
    copy: Copy,
    check: Check,
    thumbsup: ThumbsUp,
    thumbsdown: ThumbsDown,
    download: Download,
    lightbulb: Lightbulb,
    clipboardList: ClipboardList,

    // audio
    volume: Volume,
    stop: CircleStop,
    loader: Loader,

    // fluent (strings!)
    menu: "GlobalNavButton",
    homeFluent: "Home"
} as const;

export type AppIconName = keyof typeof map;

export type AppIconProps = {
    name: AppIconName;
    size?: number;
    strokeWidth?: number;
    className?: string;
    "aria-hidden"?: boolean;
};

export const AppIcon = memo(function AppIcon({ name, size, strokeWidth = 2, className, ...a11y }: AppIconProps) {
    const val = map[name];
    const cssSize = size ?? undefined;

    if (typeof val === "string") {
        return <Icon className={className} iconName={val} styles={{ root: { fontSize: cssSize ?? "var(--appicon-icon-size)" } }} {...a11y} />;
    }

    const Cmp = val;
    return (
        <Cmp
            className={clsx("appicon", className)}
            {...(cssSize ? { size: cssSize } : {})}
            strokeWidth={strokeWidth}
            style={cssSize ? undefined : { width: "var(--appicon-icon-size)", height: "var(--appicon-icon-size)" }}
            {...a11y}
        />
    );
});

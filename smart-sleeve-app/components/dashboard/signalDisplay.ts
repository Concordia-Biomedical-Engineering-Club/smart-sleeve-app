export const NORMALIZED_SIGNAL_TOGGLE_LABEL = "% MVC";
export const NORMALIZED_SIGNAL_BADGE_LABEL = "NORMALIZED";
export const RAW_SIGNAL_TOGGLE_LABEL = "Raw RMS";
export const RAW_SIGNAL_BADGE_LABEL = "RAW RMS";
export const RAW_SIGNAL_READING_LABEL = "Raw RMS";

export function getSignalToggleLabel(showNormalized: boolean): string {
  return showNormalized
    ? NORMALIZED_SIGNAL_TOGGLE_LABEL
    : RAW_SIGNAL_TOGGLE_LABEL;
}

export function getSignalBadgeLabel(showNormalized: boolean): string {
  return showNormalized
    ? NORMALIZED_SIGNAL_BADGE_LABEL
    : RAW_SIGNAL_BADGE_LABEL;
}

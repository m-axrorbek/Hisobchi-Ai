import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

export const useAccessibleDialog = ({ open, onClose, initialFocusRef = null }) => {
  const dialogRef = useRef(null);
  const previousActiveElementRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    previousActiveElementRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusInitialElement = () => {
      const focusables = getFocusableElements(dialogRef.current);
      const target = initialFocusRef?.current || focusables[0] || dialogRef.current;
      target?.focus?.();
    };

    const rafId = window.requestAnimationFrame(focusInitialElement);

    const handleKeyDown = (event) => {
      if (!dialogRef.current) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        onClose?.();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = getFocusableElements(dialogRef.current);
      if (!focusableElements.length) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(rafId);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousActiveElementRef.current?.focus?.();
    };
  }, [initialFocusRef, onClose, open]);

  return {
    dialogRef
  };
};

const getFocusableElements = (container) =>
  Array.from(container?.querySelectorAll?.(FOCUSABLE_SELECTOR) || []).filter((element) => {
    const htmlElement = /** @type {HTMLElement} */ (element);
    return !htmlElement.hasAttribute("disabled") && !htmlElement.getAttribute("aria-hidden") && htmlElement.tabIndex >= 0;
  });

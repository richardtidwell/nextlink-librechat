// Adapted from Nextlink UI 0.3.0 registry; semantic color names mapped to LibreChat.
import * as React from 'react';

import { cn } from '~/utils';

type SlotRootProps = React.HTMLAttributes<HTMLElement> & {
  children?: React.ReactNode;
  [key: string]: unknown;
};

function mergeRefs<T>(...refs: Array<React.Ref<T> | undefined>): React.RefCallback<T> {
  return (value) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === 'function') {
        ref(value);
        continue;
      }
      (ref as React.MutableRefObject<T | null>).current = value;
    }
  };
}

function composeEventHandlers<E>(
  childHandler: ((event: E) => void) | undefined,
  slotHandler: ((event: E) => void) | undefined,
) {
  return (event: E) => {
    childHandler?.(event);
    slotHandler?.(event);
  };
}

function mergeProps(childProps: Record<string, unknown>, slotProps: Record<string, unknown>) {
  const merged: Record<string, unknown> = {
    ...slotProps,
    ...childProps,
  };

  if (slotProps.className || childProps.className) {
    merged.className = cn(
      typeof slotProps.className === 'string' ? slotProps.className : undefined,
      typeof childProps.className === 'string' ? childProps.className : undefined,
    );
  }

  if (slotProps.style || childProps.style) {
    merged.style = {
      ...(slotProps.style as React.CSSProperties | undefined),
      ...(childProps.style as React.CSSProperties | undefined),
    };
  }

  for (const key of Object.keys(slotProps)) {
    if (!key.startsWith('on')) continue;
    const slotHandler = slotProps[key];
    const childHandler = childProps[key];
    if (typeof slotHandler === 'function' || typeof childHandler === 'function') {
      merged[key] = composeEventHandlers(
        childHandler as ((event: unknown) => void) | undefined,
        slotHandler as ((event: unknown) => void) | undefined,
      );
    }
  }

  return merged;
}

const SlotRoot = React.forwardRef<HTMLElement, SlotRootProps>(
  ({ children, ...props }, forwardedRef) => {
    if (!React.isValidElement(children)) {
      return null;
    }

    const child = children as React.ReactElement<{
      ref?: React.Ref<HTMLElement>;
    }>;

    return React.cloneElement(child, {
      ...mergeProps(child.props as Record<string, unknown>, props as Record<string, unknown>),
      ref: mergeRefs(child.props.ref, forwardedRef),
    });
  },
);

SlotRoot.displayName = 'Slot.Root';

export const Slot = {
  Root: SlotRoot,
};

// Adapted from Nextlink UI 0.3.0 registry; semantic color names mapped to LibreChat.
import * as React from 'react';
import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';

import { Slot } from './slot';
import { cn } from '~/utils';

/**
 * Trigger an action or commit a workflow step; exactly one primary action per surface.
 *
 * Variant grammar:
 * - `default` — the mode-resolved action fill for ordinary primary actions.
 * - `brand` / `brand-primary` — the fixed Nextlink cobalt fill on the ordinary
 *   button shadow, for identity-carrying actions (hero, auth, launch).
 * - `brand-secondary` — the promoted gold fill on ink, on the same ordinary button
 *   shadow. It is *the* one promoted control: at most one per screen, a priority
 *   cue, never a status colour and never on a form control.
 * - `destructive` / `outline` / `secondary` / `ghost` / `link` — standard tiers.
 *
 * Sizing: `default` and `icon` derive their height from `--density-control-height`
 * (36px compact · 40px standard · 44px spacious · 44px under `(pointer: coarse)`);
 * `xs` / `sm` / `lg` stay fixed at 24 / 32 / 40px.
 *
 * Disabled buttons keep pointer events (only the cursor changes) so a wrapping
 * `Tooltip` or `aria-describedby` can explain a recoverable cause.
 */
const buttonVariants = cva(
  "relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md border border-transparent bg-transparent text-sm leading-5 font-medium whitespace-nowrap no-underline transition-colors duration-150 outline-none focus-visible:border-border-field-focus focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-primary disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:not-data-loading:opacity-50 data-loading:cursor-progress aria-invalid:border-border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-surface-submit text-text-inverted shadow-sm hover:bg-surface-submit/90',
        destructive:
          'bg-surface-destructive text-text-inverted hover:bg-surface-destructive/90 dark:bg-surface-destructive/60',
        outline:
          'border-border-medium bg-surface-primary shadow-sm hover:bg-surface-hover hover:text-text-primary dark:bg-surface-secondary dark:hover:bg-surface-hover',
        secondary:
          'border-border-medium bg-surface-secondary text-text-primary shadow-sm hover:bg-surface-hover',
        ghost: 'hover:bg-surface-hover hover:text-text-primary',
        link: 'text-link underline-offset-4 hover:underline',
        // Brand fills use the same `shadow-sm` drop as `default`: depth is one
        // soft shadow, never a brand-coloured glow.
        brand: 'bg-surface-submit text-text-inverted shadow-sm hover:bg-surface-submit/90',
        'brand-primary':
          'bg-surface-submit text-text-inverted shadow-sm hover:bg-surface-submit/90',
        'brand-secondary':
          'bg-surface-submit text-text-inverted shadow-sm hover:bg-surface-submit/90',
      },
      size: {
        default:
          'h-[var(--density-control-height,2.25rem)] px-4 py-2 has-[>svg:first-child]:pl-3 has-[>svg:last-child]:pr-3',
        xs: "h-6 gap-1 px-2 [&_svg:not([class*='size-'])]:size-3",
        sm: 'h-8 gap-1.5 px-3 has-[>svg:first-child]:pl-2.5 has-[>svg:last-child]:pr-2.5',
        lg: 'h-10 px-6 has-[>svg:first-child]:pl-4 has-[>svg:last-child]:pr-4',
        icon: 'size-[var(--density-control-height,2.25rem)] p-0',
        'icon-xs': "size-6 p-0 [&_svg:not([class*='size-'])]:size-3",
        'icon-sm': 'size-8 p-0',
        'icon-lg': 'size-10 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ComponentPropsWithoutRef<'button'>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /**
   * In-button indeterminate affordance for the action itself: the label stays
   * put and keeps full contrast, a spinner is prefixed, and the button sets
   * `aria-busy="true"` and `aria-disabled="true"` with a click guard. It never
   * sets native `disabled`, so focus stays on the button while the action runs
   * and returns nowhere else when it resolves. This is the one sanctioned
   * indeterminate spinner (design-policy-v3 §6B) — region-, page- or
   * data-surface loading uses skeletons or determinate progress. Use it on the
   * button that submitted, nothing wider.
   *
   * With `asChild` the spinner is prepended inside the rendered child rather than
   * beside it, because `Slot` clones a single element.
   */
  loading?: boolean;
}

/**
 * `Slot.Root` clones one element child, so the spinner cannot be a sibling of
 * `children` under `asChild` — that would hand `Slot` an array and it renders
 * nothing at all. Prepend the spinner into the child's own children instead.
 */
function withSpinner(children: React.ReactNode, spinner: React.ReactNode) {
  if (spinner == null || !React.isValidElement<{ children?: React.ReactNode }>(children)) {
    return children;
  }

  return React.cloneElement(
    children,
    undefined,
    spinner,
    ...React.Children.toArray(children.props.children),
  );
}

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  loading = false,
  disabled,
  children,
  onClick,
  onKeyDown,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button';
  const blocked = Boolean(disabled) || loading;
  const spinner = loading ? (
    <span
      key="button-spinner"
      data-slot="button-spinner"
      aria-hidden="true"
      className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none"
    />
  ) : null;

  // Activation guard: while loading (or disabled on an `asChild` host that has
  // no native `disabled`) the button stays focusable but cannot fire. The
  // `preventDefault` also cancels the synthetic click a form dispatches at its
  // default submit button on Enter-in-input, so implicit submission is covered.
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (blocked) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    onClick?.(event);
  };

  // `asChild` hosts (links, spans) activate on Enter/Space through their own
  // key handling; block only those two keys so Tab and arrows still pass.
  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (asChild && blocked && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    onKeyDown?.(event);
  };

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      aria-disabled={loading || (asChild && Boolean(disabled)) || undefined}
      // Native `disabled` only for an explicit `disabled` on a real <button>;
      // `loading` never uses it (focus would drop to <body>), and the arbitrary
      // element `asChild` renders may not accept it at all.
      disabled={!asChild && disabled ? true : undefined}
      className={cn(buttonVariants({ variant, size, className }))}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      {...props}
    >
      {asChild ? (
        withSpinner(children, spinner)
      ) : (
        <>
          {spinner}
          {children}
        </>
      )}
    </Comp>
  );
}

export { Button, buttonVariants };

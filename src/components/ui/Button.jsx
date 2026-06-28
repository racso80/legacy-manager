export const BUTTON_VARIANTS = {
  primary: "lm-btn--primary",
  secondary: "lm-btn--secondary",
  attention: "lm-btn--attention",
  danger: "lm-btn--danger",
  disabled: "lm-btn--disabled",
};

export default function Button({
  variant = "secondary",
  className = "",
  disabled = false,
  type = "button",
  children,
  ...props
}) {
  const variantClass = disabled ? BUTTON_VARIANTS.disabled : BUTTON_VARIANTS[variant] ?? BUTTON_VARIANTS.secondary;
  return (
    <button
      {...props}
      type={type}
      disabled={disabled}
      className={`lm-btn ${variantClass} ${className}`.trim()}
    >
      {children}
    </button>
  );
}

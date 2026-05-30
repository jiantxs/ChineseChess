export interface ErrorMessageProps {
  message: string;
  className?: string;
}

export function ErrorMessage({ message, className = '' }: ErrorMessageProps) {
  return (
    <div className={`sf-error ${className}`}>
      <span className="sf-error__icon">!</span>
      {message}
    </div>
  );
}

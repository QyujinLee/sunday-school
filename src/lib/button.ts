type ButtonVariant = 'primary' | 'secondary';
type ButtonTone = 'primary' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md';
type ButtonRound = 'md' | 'pill';

type ButtonClassOptions = {
  variant: ButtonVariant;
  tone?: ButtonTone;
  size?: ButtonSize;
  round?: ButtonRound;
  fullWidth?: boolean;
  className?: string;
};

/**
 * 버튼 스타일 옵션을 공통 클래스 문자열로 변환한다.
 */
export function getButtonClassName({
  variant,
  tone = 'primary',
  size = 'md',
  round = 'md',
  fullWidth = false,
  className = '',
}: ButtonClassOptions): string {
  const classNames = [
    'btn',
    `btn-${variant}`,
    `btn-tone-${tone}`,
    `btn-${size}`,
    round === 'pill' ? 'rounded-full' : '',
    fullWidth ? 'btn-full' : '',
    className,
  ].filter(Boolean);

  return classNames.join(' ');
}


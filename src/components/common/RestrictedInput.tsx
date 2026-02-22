'use client';

import type { InputHTMLAttributes } from 'react';

type FilterType = 'korean' | 'digits';
type ExtendedFilterType = FilterType | 'phone';

interface RestrictedInputProps extends InputHTMLAttributes<HTMLInputElement> {
  filterType: ExtendedFilterType;
}

type RestrictedInputEvent = Parameters<NonNullable<InputHTMLAttributes<HTMLInputElement>['onInput']>>[0];

/**
 * 필터 타입에 따라 입력값을 정제한다.
 */
function sanitizeInputValue(value: string, filterType: ExtendedFilterType, maxLength?: number): string {
  if (filterType === 'phone') {
    const onlyDigits = value.replace(/\D/g, '').slice(0, 11);

    if (onlyDigits.length <= 3) {
      return onlyDigits;
    }

    if (onlyDigits.length <= 7) {
      return `${onlyDigits.slice(0, 3)}-${onlyDigits.slice(3)}`;
    }

    return `${onlyDigits.slice(0, 3)}-${onlyDigits.slice(3, 7)}-${onlyDigits.slice(7, 11)}`;
  }

  const sanitizedValue =
    filterType === 'korean' ? value.replace(/[^가-힣\s]/g, '') : value.replace(/\D/g, '');

  if (typeof maxLength === 'number' && maxLength > 0) {
    return sanitizedValue.slice(0, maxLength);
  }

  return sanitizedValue;
}

/**
 * 지정한 문자 규칙만 허용하는 인풋 컴포넌트다.
 */
export default function RestrictedInput({
  filterType,
  onInput,
  maxLength,
  ...props
}: RestrictedInputProps) {
  /**
   * 입력 시 허용하지 않는 문자를 즉시 제거한다.
   */
  function handleInput(event: RestrictedInputEvent) {
    const target = event.currentTarget;
    const nextValue = sanitizeInputValue(target.value, filterType, maxLength);

    if (target.value !== nextValue) {
      target.value = nextValue;
    }

    onInput?.(event);
  }

  return <input {...props} maxLength={maxLength} onInput={handleInput} />;
}

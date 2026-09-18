'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';

import { config } from '@fortawesome/fontawesome-svg-core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import ToastProvider from '@/components/common/ToastProvider';

// FontAwesome이 브라우저에서 레이어 밖 <style>을 주입하면 Tailwind 크기 클래스를 덮어쓴다.
// CSS는 globals.css에서 레이어로 불러오므로 런타임 주입을 끈다.
config.autoAddCss = false;

/**
 * 클라이언트 전역 프로바이더(Query/Toast)를 구성한다.
 */
export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            gcTime: 10 * 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        {children}
        {process.env.NODE_ENV === 'development' ? <ReactQueryDevtools initialIsOpen={false} /> : null}
      </ToastProvider>
    </QueryClientProvider>
  );
}

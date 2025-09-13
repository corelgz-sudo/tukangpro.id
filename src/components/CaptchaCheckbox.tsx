'use client';

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    grecaptcha?: any;
    __recaptchaOnLoad?: () => void;
  }
}

export default function CaptchaCheckbox({
  siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!,
  onChange,
}: {
  siteKey?: string;
  onChange: (token: string | null) => void;
}) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<number | null>(null);
  const [apiReady, setApiReady] = useState(false);

  // 1) load script sekali (pakai onload global & explicit render)
  useEffect(() => {
    if (!siteKey) {
      console.error('NEXT_PUBLIC_RECAPTCHA_SITE_KEY kosong.');
      return;
    }
    // sudah ada grecaptcha? tandai ready
    if (window.grecaptcha?.render || window.grecaptcha?.enterprise?.render) {
      setApiReady(true);
      return;
    }
    // jika script sudah pernah dimuat, jangan duplikasi
    if (document.querySelector('script[data-recaptcha]')) return;

    window.__recaptchaOnLoad = () => setApiReady(true);

    const s = document.createElement('script');
    s.src = 'https://www.google.com/recaptcha/api.js?onload=__recaptchaOnLoad&render=explicit';
    s.async = true;
    s.defer = true;
    s.setAttribute('data-recaptcha', '1');
    document.head.appendChild(s);
  }, [siteKey]);

  // 2) render widget setelah API ready
  useEffect(() => {
    if (!apiReady || !boxRef.current) return;
    if (widgetIdRef.current !== null) return; // sudah render

    const gc = window.grecaptcha;
    const renderFn =
      gc?.render?.bind(gc) ??
      gc?.enterprise?.render?.bind(gc?.enterprise);

    if (typeof renderFn !== 'function') {
      console.error(
        'grecaptcha.render tidak tersedia. Pastikan memakai reCAPTCHA v2 (checkbox), bukan v3.'
      );
      return;
    }

    widgetIdRef.current = renderFn(boxRef.current, {
      sitekey: siteKey,
      callback: (token: string) => onChange(token),
      'expired-callback': () => onChange(null),
      'error-callback': () => onChange(null),
      size: 'normal', // checkbox
      theme: 'light',
    });
  }, [apiReady, siteKey, onChange]);

  // reset nilai token saat mount
  useEffect(() => {
    onChange(null);
  }, [onChange]);

  return <div ref={boxRef} className="inline-block" />;
}

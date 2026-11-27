import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Share2 } from 'lucide-react';
import { Language } from '../types';

export interface SocialShareBarProps {
  lang: Language;
  title: string;
  shareText: string;
  shareParams: Record<string, string>;
  labelEn?: string;
  labelUr?: string;
  variant?: 'inline' | 'boxed';
}

export function buildCleanShareUrl(params: Record<string, string>): string {
  if (typeof window === 'undefined') return '';
  try {
    const url = new URL(window.location.origin + window.location.pathname);
    for (const [key, value] of Object.entries(params)) {
      if (value) {
        url.searchParams.set(key, value);
      }
    }
    return url.toString();
  } catch {
    return window.location.href;
  }
}

function WhatsAppBrandIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4 shrink-0"
      aria-hidden="true"
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
      <path d="M9.5 9.5c.3 1.7 2.3 3.7 4 4l1.2-.8c.3-.2.7-.1.9.1l1.1 1.1c.2.2.2.6 0 .9-.7.7-1.7 1.1-2.7.9-2.8-.5-5.7-3.4-6.2-6.2-.2-1 .2-2 .9-2.7.3-.2.7-.2.9 0l1.1 1.1c.2.2.3.6.1.9l-.8 1.2Z" />
    </svg>
  );
}

function FacebookBrandIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-4 h-4 shrink-0"
      aria-hidden="true"
    >
      <path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1v2.1H7.7v3h2.5V21h3.3Z" />
    </svg>
  );
}

function TwitterBrandIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-4 h-4 shrink-0"
      aria-hidden="true"
    >
      <path d="M21.5 6.6a7.7 7.7 0 0 1-2.2.6 3.9 3.9 0 0 0 1.7-2.1 7.8 7.8 0 0 1-2.5.9 3.9 3.9 0 0 0-6.6 3.5A11 11 0 0 1 3.8 5.4a3.9 3.9 0 0 0 1.2 5.2 3.8 3.8 0 0 1-1.8-.5v.1a3.9 3.9 0 0 0 3.1 3.8 4 4 0 0 1-1.7.1 3.9 3.9 0 0 0 3.6 2.7A7.8 7.8 0 0 1 2.5 18.4a11 11 0 0 0 6 1.7c7.2 0 11.1-6 11.1-11.1v-.5a7.8 7.8 0 0 0 1.9-1.9Z" />
    </svg>
  );
}

export function SocialShareBar({
  lang,
  title,
  shareText,
  shareParams,
  labelEn = 'Share this listing',
  labelUr = 'اسے شیئر کریں',
  variant = 'inline',
}: SocialShareBarProps) {
  const isUrdu = lang === 'ur';
  const [copied, setCopied] = useState(false);
  const [nativeSharedNotice, setNativeSharedNotice] = useState(false);

  const paramsKey = JSON.stringify(shareParams);
  const shareUrl = useMemo(
    () => buildCleanShareUrl(shareParams),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [paramsKey]
  );

  useEffect(() => {
    setCopied(false);
    setNativeSharedNotice(false);
  }, [shareUrl]);

  const whatsappHref = useMemo(
    () =>
      `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`,
    [shareText, shareUrl]
  );

  const facebookHref = useMemo(
    () =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        shareUrl
      )}&quote=${encodeURIComponent(shareText)}`,
    [shareText, shareUrl]
  );

  const twitterHref = useMemo(
    () =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        shareText
      )}&url=${encodeURIComponent(shareUrl)}`,
    [shareText, shareUrl]
  );

  const canNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const temp = document.createElement('textarea');
        temp.value = shareUrl;
        temp.setAttribute('readonly', '');
        temp.style.position = 'absolute';
        temp.style.left = '-9999px';
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      setCopied(false);
    }
  };

  const handleNativeShare = async () => {
    if (!canNativeShare) return;
    try {
      await navigator.share({
        title,
        text: shareText,
        url: shareUrl,
      });
      setNativeSharedNotice(true);
      window.setTimeout(() => setNativeSharedNotice(false), 2400);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
    }
  };

  const wrapperClass =
    variant === 'boxed'
      ? 'rounded-2xl bg-[#0D2314]/85 border border-[#44633B]/75 p-4 space-y-3'
      : 'pt-4 border-t border-[#44633B]/55 space-y-3';

  return (
    <div
      className={wrapperClass}
      role="region"
      aria-label={isUrdu ? labelUr : labelEn}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#FFF0A3]">
          <Share2 className="w-4 h-4 text-[#E5C65A] shrink-0" aria-hidden="true" />
          <span>{isUrdu ? labelUr : labelEn}</span>
        </div>

        {(copied || nativeSharedNotice) && (
          <span
            role="status"
            className="text-xs font-semibold text-[#E5C65A] whitespace-nowrap"
          >
            {copied
              ? isUrdu
                ? 'لنک کاپی ہو گیا'
                : 'Link copied to clipboard'
              : isUrdu
                ? 'شیئر کر دیا گیا'
                : 'Shared'}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={
            isUrdu
              ? `${title} واٹس ایپ پر شیئر کریں`
              : `Share ${title} on WhatsApp`
          }
          className="min-h-[40px] inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-[#4EA868]/50 bg-[#17462B] hover:bg-[#1F5C39] text-xs sm:text-sm font-bold text-[#F8F7EA] transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5C65A]"
        >
          <WhatsAppBrandIcon />
          <span>{isUrdu ? 'واٹس ایپ' : 'WhatsApp'}</span>
        </a>

        <a
          href={facebookHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={
            isUrdu
              ? `${title} فیس بک پر شیئر کریں`
              : `Share ${title} on Facebook`
          }
          className="min-h-[40px] inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-[#44633B] bg-[#13311D] hover:bg-[#263B20] hover:border-[#E5C65A]/55 text-xs sm:text-sm font-bold text-[#FFF0A3] transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5C65A]"
        >
          <FacebookBrandIcon />
          <span>{isUrdu ? 'فیس بک' : 'Facebook'}</span>
        </a>

        <a
          href={twitterHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={
            isUrdu
              ? `${title} ٹویٹر پر شیئر کریں`
              : `Share ${title} on Twitter`
          }
          className="min-h-[40px] inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-[#44633B] bg-[#13311D] hover:bg-[#263B20] hover:border-[#E5C65A]/55 text-xs sm:text-sm font-bold text-[#FFF0A3] transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5C65A]"
        >
          <TwitterBrandIcon />
          <span>{isUrdu ? 'ٹویٹر' : 'Twitter'}</span>
        </a>

        <button
          type="button"
          onClick={handleCopyLink}
          className={`min-h-[40px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-bold transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5C65A] ${
            copied
              ? 'bg-[#E5C65A] border-[#E5C65A] text-[#102B19]'
              : 'bg-[#263B20] hover:bg-[#314B29] border-[#E5C65A]/45 text-[#FFF0A3]'
          }`}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{isUrdu ? 'کاپی ہو گیا' : 'Copied'}</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{isUrdu ? 'لنک کاپی' : 'Copy Link'}</span>
            </>
          )}
        </button>

        {canNativeShare && (
          <button
            type="button"
            onClick={handleNativeShare}
            aria-label={isUrdu ? 'مزید ایپس پر شیئر کریں' : 'More share options'}
            className="min-h-[40px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-[#44633B] bg-[#0D2314] hover:bg-[#263B20] text-xs sm:text-sm font-semibold text-[#C7D3BD] hover:text-[#FFF0A3] transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5C65A]"
          >
            <Share2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{isUrdu ? 'مزید' : 'More'}</span>
          </button>
        )}
      </div>
    </div>
  );
}

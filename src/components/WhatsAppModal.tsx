import { useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  MapPin,
  MessageCircle,
  User,
  X,
} from 'lucide-react';
import { FarmerProfile, Language, SeedItem } from '../types';

interface WhatsAppModalProps {
  seed: SeedItem | null;
  farmer?: FarmerProfile | null;
  lang: Language;
  onClose: () => void;
}

export function WhatsAppModal({
  seed,
  farmer = null,
  lang,
  onClose,
}: WhatsAppModalProps) {
  const isUrdu = lang === 'ur';
  const [copied, setCopied] = useState(false);

  const targetOwnerUr = seed ? seed.ownerUr : farmer?.nameUr ?? '';
  const targetOwnerEn = seed ? seed.ownerEn : farmer?.nameEn ?? '';
  const targetCityUr = seed ? seed.cityUr : farmer?.cityUr ?? '';
  const targetCityEn = seed ? seed.cityEn : farmer?.cityEn ?? '';
  const targetWhatsapp = seed ? seed.whatsapp : farmer?.whatsapp ?? '';

  const defaultMessage = seed
    ? isUrdu
      ? `السلام علیکم ${seed.ownerUr} صاحب! میں نے "دیسی بیج ایکسچینج" پر آپ کا "${seed.nameUr}" دیکھا ہے۔ کیا یہ بیج ابھی دستیاب ہے؟`
      : `Assalam-o-Alaikum ${seed.ownerEn}! I saw your "${seed.nameEn}" listing on Desi Beej Exchange. Is it still available?`
    : farmer
      ? isUrdu
        ? `السلام علیکم ${farmer.nameUr} صاحب! میں نے "دیسی بیج ایکسچینج" پر آپ کی کسان پروفائل دیکھی ہے اور دیسی بیج کے حوالے سے رابطہ کرنا چاہتا ہوں۔`
        : `Assalam-o-Alaikum ${farmer.nameEn}! I saw your Kisan Profile on Desi Beej Exchange and would like to connect about desi seeds.`
      : '';

  const [message, setMessage] = useState(defaultMessage);

  if (!seed && !farmer) return null;

  const formattedPhone = `+${targetWhatsapp}`;
  const waUrl = `https://wa.me/${targetWhatsapp}?text=${encodeURIComponent(
    message || defaultMessage
  )}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedPhone);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#08170D]/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wa-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-[#13311D]/95 backdrop-blur-xl border border-[#E5C65A]/30 shadow-2xl overflow-hidden text-[#F8F7EA]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#1E462A] border-b border-[#E5C65A]/20">
          <div className="flex items-center gap-2.5">
            <MessageCircle
              className="w-5 h-5 text-[#FFF0A3] shrink-0"
              aria-hidden="true"
            />
            <h2 id="wa-modal-title" className="text-lg font-bold text-[#FFF0A3]">
              {isUrdu ? 'واٹس ایپ پر براہِ راست رابطہ' : 'Direct WhatsApp Contact'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={isUrdu ? 'بند کریں' : 'Close'}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-[#F8F7EA] hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="p-4 rounded-xl bg-[#263B20]/70 border border-[#E5C65A]/25 space-y-2">
            {seed && (
              <div className="text-base font-bold text-[#FFF0A3]">
                {isUrdu ? seed.nameUr : seed.nameEn}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-4 text-sm text-[#C7D3BD]">
              <span className="inline-flex items-center gap-1.5 font-semibold text-[#F8F7EA]">
                <User className="w-4 h-4 text-[#E5C65A]" aria-hidden="true" />
                {isUrdu ? targetOwnerUr : targetOwnerEn}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#E5C65A]" aria-hidden="true" />
                {isUrdu ? targetCityUr : targetCityEn}
              </span>
            </div>
            <div className="pt-2 border-t border-[#E5C65A]/15 flex items-center justify-between gap-2">
              <span
                className="text-sm font-semibold text-[#FFF0A3] tabular-nums"
                dir="ltr"
              >
                {formattedPhone}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#102B19] hover:bg-[#193F25] border border-[#44633B] text-[#F8F7EA] transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#E5C65A]" />
                    <span>{isUrdu ? 'کاپی ہو گیا' : 'Copied'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#E5C65A]" />
                    <span>{isUrdu ? 'نمبر کاپی کریں' : 'Copy Number'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="wa-message-box"
              className="block text-sm font-semibold text-[#FFF0A3] mb-1.5"
            >
              {isUrdu ? 'پیغام میں ترمیم کریں:' : 'Customize your message:'}
            </label>
            <textarea
              id="wa-message-box"
              rows={3}
              value={message || defaultMessage}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm text-[#F8F7EA] leading-relaxed focus:outline-none focus:border-[#E5C65A]"
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] font-bold text-sm sm:text-base transition-colors"
            >
              <ExternalLink className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{isUrdu ? 'واٹس ایپ چیٹ کھولیں' : 'Open WhatsApp Chat'}</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2.5 rounded-xl border border-[#44633B] bg-[#263B20]/70 hover:bg-[#263B20] text-[#F8F7EA] font-semibold text-sm transition-colors cursor-pointer"
            >
              {isUrdu ? 'بند کریں' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

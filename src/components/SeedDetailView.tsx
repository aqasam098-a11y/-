import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  BadgeCheck,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Heart,
  Lock,
  MapPin,
  MessageCircle,
  Mic,
  PhoneCall,
  Send,
  Share2,
  ShieldCheck,
  Sprout,
  Square,
  Star,
  Trash2,
  User,
  X,
} from 'lucide-react';
import {
  CATEGORIES,
  getInitialSeedChatMessages,
  getSeedMapUrl,
  UI_COPY,
} from '../data/seeds';
import { ChatMessage, Language, SeedItem, SeedReview } from '../types';
import {
  blobToDataUrl,
  formatDuration,
  getCurrentTimestamp,
} from '../utils/media';
import { VoiceMessagePlayer } from './VoiceMessagePlayer';
import { SocialShareBar, buildCleanShareUrl } from './SocialShareBar';

interface SeedDetailViewProps {
  seed: SeedItem;
  lang: Language;
  reviews: SeedReview[];
  isPhoneHidden?: boolean;
  autoFocusChat?: boolean;
  isSaved?: boolean;
  onToggleSave?: (seedId: string) => void;
  onAddReview: (
    seedId: string,
    review: { reviewerName: string; rating: number; comment: string }
  ) => void;
  onBack: () => void;
  onSelectOwner: (seed: SeedItem) => void;
  onContactWhatsApp: (seed: SeedItem) => void;
}

export function SeedDetailView({
  seed,
  lang,
  reviews,
  isPhoneHidden = Boolean(seed.hidePhone),
  autoFocusChat = false,
  isSaved = false,
  onToggleSave,
  onAddReview,
  onBack,
  onSelectOwner,
  onContactWhatsApp,
}: SeedDetailViewProps) {
  const t = UI_COPY[lang];
  const isUrdu = lang === 'ur';
  const [imgFailed, setImgFailed] = useState(false);

  const storageKey = `desibeej_chat_${seed.id}`;
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback to initial messages
    }
    return getInitialSeedChatMessages(seed);
  });

  const [textInput, setTextInput] = useState('');
  const [storageWarning, setStorageWarning] = useState('');

  // Share State
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [shareFeedback, setShareFeedback] = useState('');

  // Review Form State
  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [reviewerName, setReviewerName] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewSavedNotice, setReviewSavedNotice] = useState(false);

  // MediaRecorder voice recording state
  const [recordingState, setRecordingState] = useState<
    'idle' | 'recording' | 'preview'
  >('idle');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [pendingVoice, setPendingVoice] = useState<{
    dataUrl: string;
    durationSec: number;
  } | null>(null);
  const [micError, setMicError] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const recordingSecondsRef = useRef(0);
  const cancelRecordingFlagRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const chatBoxRef = useRef<HTMLElement | null>(null);
  const chatInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!autoFocusChat) return;
    const timer = window.setTimeout(() => {
      chatBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      chatInputRef.current?.focus();
    }, 120);
    return () => window.clearTimeout(timer);
  }, [autoFocusChat, seed.id]);

  // Sync messages when seed changes
  useEffect(() => {
    setImgFailed(false);
    try {
      const saved = localStorage.getItem(`desibeej_chat_${seed.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      }
    } catch {
      // Ignore parse error
    }
    setMessages(getInitialSeedChatMessages(seed));
  }, [seed]);

  // Persist messages to localStorage whenever they update
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
      setStorageWarning('');
    } catch {
      setStorageWarning(
        isUrdu
          ? 'براؤزر اسٹوریج بھر جانے کی وجہ سے پرانا پیغام محفوظ نہیں ہو سکی۔'
          : 'Browser storage limit reached; some older messages may not persist.'
      );
    }
  }, [messages, storageKey, isUrdu]);

  // Scroll chat thread to bottom when new message arrives
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages.length]);

  // Cleanup recorder stream & timers on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const stopTimerAndStream = () => {
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const handleSendText = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = textInput.trim();
    if (!trimmed) return;

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'buyer',
      type: 'text',
      text: trimmed,
      timestamp: getCurrentTimestamp(),
      createdAt: Date.now(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setTextInput('');
  };

  const handleShareWhatsappInChat = () => {
    const formattedPhone = `+${seed.whatsapp}`;
    const localFormat = seed.whatsapp.startsWith('92')
      ? `0${seed.whatsapp.slice(2)}`
      : seed.whatsapp;

    const ownerName = isUrdu ? seed.ownerUr : seed.ownerEn;
    const shareMessage: ChatMessage = {
      id: `share-wa-${Date.now()}`,
      sender: 'owner',
      type: 'text',
      text: isUrdu
        ? `میرا واٹس ایپ / فون نمبر (${ownerName}): ${localFormat} (${formattedPhone}) — آپ اب اس نمبر پر واٹس ایپ یا کال کے ذریعے بھی رابطہ کر سکتے ہیں۔`
        : `My WhatsApp / Phone Number (${ownerName}): ${localFormat} (${formattedPhone}) — you can reach me directly on WhatsApp now.`,
      timestamp: getCurrentTimestamp(),
      createdAt: Date.now(),
    };

    setMessages((prev) => [...prev, shareMessage]);
  };

  const handleShareLocationInChat = () => {
    const mapUrl = getSeedMapUrl(seed);
    const cityName = isUrdu ? seed.cityUr : seed.cityEn;
    const areaName = seed.hideExactLocation
      ? ''
      : isUrdu
        ? seed.areaUr
        : seed.areaEn;
    const place = areaName ? `${cityName} (${areaName})` : cityName;
    const locMessage: ChatMessage = {
      id: `share-loc-${Date.now()}`,
      sender: 'owner',
      type: 'text',
      text: isUrdu
        ? `مقام: ${place} — گوگل میپس پر دیکھیں: ${mapUrl}`
        : `Location: ${place} — View on Google Maps: ${mapUrl}`,
      timestamp: getCurrentTimestamp(),
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, locMessage]);
  };

  const startVoiceRecording = async () => {
    setMicError('');
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      setMicError(
        isUrdu
          ? 'آپ کا براؤزر وائس ریکارڈنگ (MediaRecorder) کو سپورٹ نہیں کرتا۔'
          : 'Your browser does not support voice recording.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];
      cancelRecordingFlagRef.current = false;
      recordingSecondsRef.current = 0;
      setRecordingSeconds(0);

      const preferredTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
      ];
      const mimeType = preferredTypes.find((type) =>
        MediaRecorder.isTypeSupported(type)
      );

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stopTimerAndStream();
        if (cancelRecordingFlagRef.current) {
          audioChunksRef.current = [];
          setRecordingState('idle');
          return;
        }

        const blobType = recorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: blobType });
        audioChunksRef.current = [];

        if (audioBlob.size === 0) {
          setRecordingState('idle');
          return;
        }

        try {
          const dataUrl = await blobToDataUrl(audioBlob);
          setPendingVoice({
            dataUrl,
            durationSec: Math.max(1, recordingSecondsRef.current),
          });
          setRecordingState('preview');
        } catch {
          setMicError(
            isUrdu
              ? 'وائس میسج محفوظ کرنے میں مسئلہ پیش آیا۔'
              : 'Could not process the recorded voice note.'
          );
          setRecordingState('idle');
        }
      };

      recorder.start(250);
      setRecordingState('recording');

      timerIntervalRef.current = window.setInterval(() => {
        recordingSecondsRef.current += 1;
        setRecordingSeconds(recordingSecondsRef.current);
      }, 1000);
    } catch {
      stopTimerAndStream();
      setRecordingState('idle');
      setMicError(
        isUrdu
          ? 'مائیکروفون تک رسائی کی اجازت نہیں ملی۔ براہِ کرم براؤزر کی سیٹنگز میں مائیکروفون آن کریں۔'
          : 'Microphone access was denied. Please allow microphone permission in your browser.'
      );
    }
  };

  const stopVoiceRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      cancelRecordingFlagRef.current = false;
      mediaRecorderRef.current.stop();
    }
  };

  const cancelVoiceRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      cancelRecordingFlagRef.current = true;
      mediaRecorderRef.current.stop();
    } else {
      stopTimerAndStream();
      setRecordingState('idle');
    }
    setPendingVoice(null);
  };

  const sendPendingVoice = () => {
    if (!pendingVoice) return;
    const newVoiceMsg: ChatMessage = {
      id: `voice-${Date.now()}`,
      sender: 'buyer',
      type: 'voice',
      audioDataUrl: pendingVoice.dataUrl,
      durationSec: pendingVoice.durationSec,
      timestamp: getCurrentTimestamp(),
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, newVoiceMsg]);
    setPendingVoice(null);
    setRecordingState('idle');
  };

  const discardPendingVoice = () => {
    setPendingVoice(null);
    setRecordingState('idle');
  };

  const categoryObj = CATEGORIES.find((c) => c.id === seed.category);
  const categoryLabel = categoryObj
    ? isUrdu
      ? categoryObj.ur
      : categoryObj.en
    : '';
  const seedName = isUrdu ? seed.nameUr : seed.nameEn;
  const season = isUrdu ? seed.seasonUr : seed.seasonEn;
  const quantity = isUrdu ? seed.quantityUr : seed.quantityEn;
  const city = isUrdu ? seed.cityUr : seed.cityEn;
  const area = seed.hideExactLocation ? '' : isUrdu ? seed.areaUr : seed.areaEn;
  const locationLabel = area ? `${city} (${area})` : city;
  const owner = isUrdu ? seed.ownerUr : seed.ownerEn;
  const detailedDesc = isUrdu
    ? seed.detailedDescriptionUr || seed.descriptionUr
    : seed.detailedDescriptionEn || seed.descriptionEn;
  const isExchange = seed.listingType === 'exchange';

  const seedShareUrl = buildCleanShareUrl({ seed: seed.id });
  const shareText = isUrdu
    ? `${seedName} (${city}) — دیسی بیج ایکسچینج پر خالص دیسی بیج دیکھیں:`
    : `${seedName} (${city}) — Check out this pure desi seed on Desi Beej Exchange:`;

  const handleShareClick = async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: seedName,
          text: shareText,
          url: seedShareUrl,
        });
        setShareFeedback(
          isUrdu ? 'بیج کا لنک شیئر کر دیا گیا' : 'Seed link shared'
        );
        window.setTimeout(() => setShareFeedback(''), 3000);
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
      }
    }
    setLinkCopied(false);
    setIsShareDialogOpen(true);
  };

  const handleCopyShareLink = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(seedShareUrl);
      } else {
        const temp = document.createElement('input');
        temp.value = seedShareUrl;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
      }
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2500);
    } catch {
      setLinkCopied(false);
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 text-[#F8F7EA]">
      {/* Back & Share Top Action Row */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#E5C65A]/35 bg-[#183822]/80 hover:bg-[#263B20] text-sm sm:text-base font-semibold text-[#FFF0A3] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5C65A]"
        >
          <span>{t.backToHome}</span>
        </button>

        <div className="flex flex-wrap items-center gap-2.5">
          {shareFeedback && (
            <span
              role="status"
              className="text-xs sm:text-sm font-semibold text-[#FFF0A3] bg-[#263B20] border border-[#E5C65A]/40 px-3 py-1.5 rounded-lg"
            >
              {shareFeedback}
            </span>
          )}
          {onToggleSave && (
            <button
              type="button"
              onClick={() => onToggleSave(seed.id)}
              aria-pressed={isSaved}
              className={`min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm sm:text-base font-semibold transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5C65A] ${
                isSaved
                  ? 'bg-[#FFF0A3] border-[#E5C65A] text-[#9E2A1F]'
                  : 'bg-[#183822]/80 hover:bg-[#263B20] border-[#44633B] text-[#F8F7EA]'
              }`}
            >
              <Heart
                className={`w-4 h-4 shrink-0 ${
                  isSaved ? 'fill-[#9E2A1F] text-[#9E2A1F]' : 'text-[#E5C65A]'
                }`}
                aria-hidden="true"
              />
              <span>
                {isSaved
                  ? isUrdu
                    ? 'محفوظ شدہ'
                    : 'Saved'
                  : isUrdu
                    ? 'محفوظ کریں'
                    : 'Save'}
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={handleShareClick}
            className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#E5C65A]/45 bg-[#263B20]/90 hover:bg-[#2E4826] text-sm sm:text-base font-semibold text-[#FFF0A3] transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5C65A]"
          >
            <Share2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{isUrdu ? 'شیئر کریں' : 'Share'}</span>
          </button>
        </div>
      </div>

      {/* Main Split Grid: Seed Info & Chat Box */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Seed Details Panel */}
        <article className="lg:col-span-6 agri-glass-elevated rounded-2xl overflow-hidden">
          <div className="relative aspect-[4/3] w-full bg-[#263B20] border-b border-[#44633B]/60">
            {seed.imageUrl && !imgFailed ? (
              <img
                src={seed.imageUrl}
                alt={seedName}
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-[#1B4227] via-[#263B20] to-[#102B19]">
                <div className="w-16 h-16 rounded-full bg-[#FFF0A3]/15 border border-[#E5C65A]/30 flex items-center justify-center text-[#FFF0A3] mb-3">
                  <Sprout className="w-8 h-8" aria-hidden="true" />
                </div>
                <span className="text-base font-bold text-[#FFF0A3]">
                  {seedName}
                </span>
                <span className="text-sm text-[#C7D3BD] mt-1">
                  {categoryLabel}
                </span>
              </div>
            )}
          </div>

          <div className="p-5 sm:p-7 space-y-5">
            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-medium text-[#C7D3BD]">
              <span className="text-[#E5C65A] font-semibold">{categoryLabel}</span>
              <span aria-hidden="true">·</span>
              <span>
                {isUrdu ? `مقدار: ${quantity}` : `Qty: ${quantity}`}
              </span>
              <span aria-hidden="true">·</span>
              <span>{season}</span>
            </div>

            {/* Title + Rating & Trust Badges */}
            <div className="space-y-2.5">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#FFF0A3] leading-snug font-display-heading">
                {seedName}
              </h1>

              {reviews.length > 0 && (() => {
                const avg =
                  reviews.reduce((acc, r) => acc + r.rating, 0) /
                  reviews.length;
                const isTrusted = avg >= 4.5;
                return (
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#263B20] border border-[#E5C65A]/40 text-xs sm:text-sm font-bold text-[#FFF0A3] tabular-nums">
                      <Star
                        className="w-4 h-4 text-[#E5C65A] fill-[#E5C65A] shrink-0"
                        aria-hidden="true"
                      />
                      <span>{avg.toFixed(1)}</span>
                      <span className="font-normal text-[#C7D3BD]">
                        ({reviews.length}{' '}
                        {isUrdu ? 'آراء' : reviews.length === 1 ? 'review' : 'reviews'})
                      </span>
                    </span>

                    {isTrusted && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#E5C65A]/15 border border-[#E5C65A]/40 text-xs sm:text-sm font-semibold text-[#FFF0A3]">
                        <BadgeCheck
                          className="w-4 h-4 text-[#E5C65A] shrink-0"
                          aria-hidden="true"
                        />
                        <span>{t.trustedFarmerBadge}</span>
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Status Badge + Price / Exchange Preference */}
            <div className="p-4 rounded-xl bg-[#102B19]/75 border border-[#44633B]/70 flex flex-wrap items-center justify-between gap-3">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-md text-xs sm:text-sm font-semibold border whitespace-nowrap ${
                  isExchange
                    ? 'bg-[#E5C65A]/15 text-[#FFF0A3] border-[#E5C65A]/40'
                    : 'bg-[#263B20] text-[#E5C65A] border-[#4E7143]'
                }`}
              >
                {isExchange ? t.badgeExchange : t.badgeSale}
              </span>

              {isExchange ? (
                <span className="text-sm sm:text-base font-semibold text-[#FFF0A3]">
                  {isUrdu
                    ? seed.exchangeNoteUr || 'برابر مقدار میں تبادلہ'
                    : seed.exchangeNoteEn || 'Equal exchange'}
                </span>
              ) : (
                <span className="text-lg sm:text-xl font-bold text-[#FFF0A3] tabular-nums">
                  {seed.pricePkr ?? 0} {t.currency}{' '}
                  <span className="text-xs sm:text-sm font-normal text-[#C7D3BD]">
                    / {isUrdu ? seed.unitUr || 'پیکٹ' : seed.unitEn || 'packet'}
                  </span>
                </span>
              )}
            </div>

            {/* City & Owner Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm sm:text-base text-[#E6ECE0]">
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#102B19]/75 border border-[#44633B]/60">
                <MapPin
                  className="w-4 h-4 text-[#E5C65A] shrink-0 mt-1"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <span className="block text-xs text-[#C7D3BD]">
                    {seed.hideExactLocation
                      ? isUrdu
                        ? 'شہر / ضلع (مقام کی رازداری)'
                        : 'City (Location Privacy)'
                      : isUrdu
                        ? 'شہر / ضلع اور علاقہ'
                        : 'City / Area'}
                  </span>
                  <span className="font-semibold text-[#F8F7EA] block">{locationLabel}</span>
                  {seed.hideExactLocation && (
                    <span className="block text-[11px] text-[#E5C65A] mt-0.5">
                      {t.locationPrivacyNotice}
                    </span>
                  )}
                  <a
                    href={getSeedMapUrl(seed)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-1.5 text-xs font-semibold text-[#FFF0A3] hover:underline underline-offset-4"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    <span>{t.viewOnMapBtn}</span>
                  </a>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onSelectOwner(seed)}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-[#102B19]/75 hover:bg-[#263B20] border border-[#44633B]/60 hover:border-[#E5C65A]/50 text-start transition-colors cursor-pointer"
              >
                <User
                  className="w-4 h-4 text-[#E5C65A] shrink-0"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <span className="block text-xs text-[#C7D3BD]">
                    {isUrdu ? 'بیج کا مالک (پروفائل دیکھیں)' : 'Seed Owner (View Profile)'}
                  </span>
                  <span className="font-semibold text-[#FFF0A3] underline underline-offset-4 truncate block">
                    {owner}
                  </span>
                </div>
              </button>
            </div>

            {/* Detailed Seed Description */}
            <div className="space-y-2">
              <h2 className="text-base sm:text-lg font-bold text-[#FFF0A3]">
                {isUrdu ? 'بیج کی مکمل تفصیل' : 'Detailed Seed Information'}
              </h2>
              <p className="text-sm sm:text-base text-[#D7E2CE] leading-relaxed">
                {detailedDesc}
              </p>
            </div>

            {/* Purity Guarantee & WhatsApp Action OR Hidden-Phone Notice */}
            <div className="pt-4 border-t border-[#E5C65A]/15 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-[#E5C65A] font-medium">
                <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>
                  {isUrdu
                    ? 'خالص دیسی اور غیر ترمیم شدہ (Non-GMO)'
                    : 'Pure heirloom & Non-GMO seed'}
                </span>
              </div>

              {isPhoneHidden ? (
                <div className="p-3.5 rounded-xl bg-[#263B20]/80 border border-[#E5C65A]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2 text-xs sm:text-sm font-semibold text-[#FFF0A3]">
                    <Lock className="w-4 h-4 shrink-0 mt-0.5 text-[#E5C65A]" aria-hidden="true" />
                    <span>{t.phoneHiddenNotice}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      chatBoxRef.current?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                      });
                      chatInputRef.current?.focus();
                    }}
                    className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {t.openAppChatBtn}
                  </button>
                </div>
              ) : (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => onContactWhatsApp(seed)}
                    className="min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-sm font-bold transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{t.whatsappBtn}</span>
                  </button>
                </div>
              )}

              <SocialShareBar
                lang={lang}
                title={seedName}
                shareText={shareText}
                shareParams={{ seed: seed.id }}
                labelEn="Share this seed listing"
                labelUr="یہ بیج لسٹنگ شیئر کریں"
                variant="inline"
              />
            </div>
          </div>
        </article>

        {/* Built-in Text & Voice Chat Box */}
        <section
          id="seed-chat-box"
          ref={chatBoxRef}
          aria-label={
            isUrdu ? 'مالک سے براہِ راست چیٹ' : 'Direct Chat with Seed Owner'
          }
          className="lg:col-span-6 agri-glass-elevated rounded-2xl flex flex-col overflow-hidden"
        >
          {/* Chat Header */}
          <div className="px-5 py-4 bg-[#1B4227] border-b border-[#E5C65A]/20 text-[#F8F7EA] flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-[#FFF0A3] truncate">
                <button
                  type="button"
                  onClick={() => onSelectOwner(seed)}
                  className="hover:underline underline-offset-4 text-start cursor-pointer"
                >
                  {isUrdu
                    ? `${owner} سے براہِ راست بات کریں`
                    : `Direct Chat with ${owner}`}
                </button>
              </h2>
              <p className="text-xs text-[#C7D3BD] mt-0.5 truncate">
                {city} ·{' '}
                {isUrdu
                  ? 'ٹیکسٹ یا وائس میسج بھیجیں'
                  : 'Send text or voice notes'}
              </p>
            </div>
            <span className="text-xs font-semibold text-[#E5C65A] whitespace-nowrap shrink-0">
              {isUrdu ? 'محفوظ چیٹ' : 'Saved locally'}
            </span>
          </div>

          {/* Chat Thread */}
          <div className="flex-1 min-h-[340px] max-h-[460px] overflow-y-auto p-4 sm:p-5 space-y-4 bg-[#0D2314]/80">
            {messages.map((msg) => {
              const isBuyer = msg.sender === 'buyer';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    isBuyer ? 'items-end' : 'items-start'
                  }`}
                >
                  <div className="flex items-center gap-2 text-[11px] font-medium text-[#B7C7AC] mb-1 px-1">
                    <span>
                      {isBuyer
                        ? isUrdu
                          ? 'آپ'
                          : 'You'
                        : owner}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span dir="ltr" className="tabular-nums">
                      {msg.timestamp}
                    </span>
                  </div>

                  <div
                    className={`max-w-[88%] sm:max-w-[82%] rounded-2xl px-4 py-3 text-sm sm:text-base leading-relaxed ${
                      isBuyer
                        ? 'bg-[#E5C65A] text-[#102B19] rounded-be-sm font-medium'
                        : 'bg-[#183822] text-[#F8F7EA] border border-[#44633B] rounded-bs-sm'
                    }`}
                  >
                    {msg.type === 'voice' && msg.audioDataUrl ? (
                      <VoiceMessagePlayer
                        src={msg.audioDataUrl}
                        initialDuration={msg.durationSec}
                        variant={isBuyer ? 'buyer' : 'owner'}
                        isUrdu={isUrdu}
                      />
                    ) : (() => {
                      const raw = msg.text || '';
                      const mapMatch = raw.match(/https:\/\/www\.google\.com\/maps[^\s)]+/);
                      if (!mapMatch) {
                        return (
                          <p dir="auto" className="whitespace-pre-wrap break-words">
                            {raw}
                          </p>
                        );
                      }
                      const mapHref = mapMatch[0];
                      const cleanMsg = raw.replace(mapHref, '').trim();
                      return (
                        <div className="space-y-2">
                          <p dir="auto" className="whitespace-pre-wrap break-words">
                            {cleanMsg}
                          </p>
                          <a
                            href={mapHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#263B20] text-[#FFF0A3] border border-[#E5C65A]/40 hover:bg-[#314C29] text-xs font-bold"
                          >
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            <span>{t.viewOnMapBtn}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Inline Error / Storage Warning */}
          {(micError || storageWarning) && (
            <div className="px-4 py-2.5 bg-red-950/70 border-t border-red-400/40 text-xs sm:text-sm text-red-200">
              {micError || storageWarning}
            </div>
          )}

          {/* Voice Recorder Preview / Active State */}
          {recordingState === 'recording' && (
            <div className="px-4 py-3 bg-[#263B20] border-t border-[#E5C65A]/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                <span className="text-sm font-semibold text-[#FFF0A3]">
                  {isUrdu ? 'وائس میسج ریکارڈ ہو رہا ہے...' : 'Recording voice note...'}
                </span>
                <span
                  dir="ltr"
                  className="text-sm font-bold text-[#E5C65A] tabular-nums"
                >
                  {formatDuration(recordingSeconds)}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={cancelVoiceRecording}
                  className="min-h-[38px] px-3 py-1.5 rounded-lg border border-[#44633B] bg-[#102B19] hover:bg-[#183822] text-xs font-semibold text-[#C7D3BD] cursor-pointer"
                >
                  {isUrdu ? 'منسوخ' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={stopVoiceRecording}
                  className="min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-xs sm:text-sm font-bold cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>{isUrdu ? 'روکیں' : 'Stop'}</span>
                </button>
              </div>
            </div>
          )}

          {recordingState === 'preview' && pendingVoice && (
            <div className="px-4 py-3 bg-[#1B4227] border-t border-[#E5C65A]/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <VoiceMessagePlayer
                  src={pendingVoice.dataUrl}
                  initialDuration={pendingVoice.durationSec}
                  variant="preview"
                  isUrdu={isUrdu}
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={discardPendingVoice}
                  aria-label={isUrdu ? 'حذف کریں' : 'Discard'}
                  className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-400/40 bg-red-950/50 hover:bg-red-900/60 text-xs font-semibold text-red-200 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isUrdu ? 'حذف کریں' : 'Discard'}</span>
                </button>
                <button
                  type="button"
                  onClick={sendPendingVoice}
                  className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-xs sm:text-sm font-bold cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{isUrdu ? 'وائس میسج بھیجیں' : 'Send Voice'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick Actions: Share Location & Share WhatsApp Number Inside Chat */}
          <div className="px-4 py-2.5 bg-[#13311D] border-t border-[#E5C65A]/15 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium text-[#C7D3BD]">
              {isUrdu ? 'فوری شیئرنگ:' : 'Quick share:'}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleShareLocationInChat}
                className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#263B20] hover:bg-[#314C29] border border-[#E5C65A]/30 text-xs font-semibold text-[#FFF0A3] transition-colors cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5 shrink-0 text-[#E5C65A]" aria-hidden="true" />
                <span>{t.shareLocationInChatBtn}</span>
              </button>
              <button
                type="button"
                onClick={handleShareWhatsappInChat}
                className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#263B20] hover:bg-[#314C29] border border-[#E5C65A]/30 text-xs font-semibold text-[#FFF0A3] transition-colors cursor-pointer"
              >
                <PhoneCall className="w-3.5 h-3.5 shrink-0 text-[#E5C65A]" aria-hidden="true" />
                <span>{t.sharePhoneInChatBtn}</span>
              </button>
            </div>
          </div>

          {/* Chat Composer Bar */}
          <form
            onSubmit={handleSendText}
            className="p-3 sm:p-4 bg-[#183822] border-t border-[#E5C65A]/20 flex items-center gap-2"
          >
            <label htmlFor="chat-text-input" className="sr-only">
              {isUrdu ? 'اپنا پیغام لکھیں' : 'Type your message'}
            </label>
            <input
              ref={chatInputRef}
              id="chat-text-input"
              type="text"
              dir="auto"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              disabled={recordingState === 'recording'}
              placeholder={
                isUrdu
                  ? 'اردو یا انگلش میں پیغام لکھیں...'
                  : 'Write a message in Urdu or English...'
              }
              className="flex-1 min-w-0 min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm sm:text-base text-[#F8F7EA] placeholder:text-[#8BA082] focus:outline-none focus:border-[#E5C65A] disabled:opacity-60"
            />

            <button
              type="button"
              onClick={
                recordingState === 'recording'
                  ? stopVoiceRecording
                  : startVoiceRecording
              }
              disabled={recordingState === 'preview'}
              title={isUrdu ? 'وائس میسج ریکارڈ کریں' : 'Record voice message'}
              className={`min-h-[44px] inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 ${
                recordingState === 'recording'
                  ? 'bg-red-600 border-red-500 text-white'
                  : 'bg-[#263B20] border-[#E5C65A]/40 text-[#FFF0A3] hover:bg-[#314C29]'
              }`}
            >
              <Mic className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">
                {isUrdu ? 'وائس میسج' : 'Voice'}
              </span>
            </button>

            <button
              type="submit"
              disabled={!textInput.trim() || recordingState === 'recording'}
              className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] disabled:opacity-45 text-[#102B19] text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{isUrdu ? 'بھیجیں' : 'Send'}</span>
            </button>
          </form>
        </section>
      </div>

      {/* Rate & Review Section ("ریٹنگ اور رائے دیں") */}
      <section
        aria-label={t.reviewSectionTitle}
        className="mt-8 agri-glass-elevated rounded-2xl p-5 sm:p-7"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Review Submission Form */}
          <div className="lg:col-span-5 space-y-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#FFF0A3]">
                {t.reviewSectionTitle}
              </h2>
              <p className="text-sm text-[#C7D3BD] mt-1">
                {isUrdu
                  ? 'بیج کی خالصیت، صفائی اور اُگاؤ کے بارے میں اپنا تجربہ درج کریں۔'
                  : 'Rate seed purity, cleanliness, and germination experience.'}
              </p>
            </div>

            {reviewSavedNotice && (
              <div
                role="status"
                className="p-3 rounded-xl bg-[#263B20] border border-[#E5C65A]/40 flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#FFF0A3]"
              >
                <CheckCircle2 className="w-4 h-4 text-[#E5C65A] shrink-0" />
                <span>
                  {isUrdu
                    ? 'آپ کی ریٹنگ اور رائے شامل کر دی گئی ہے۔'
                    : 'Your rating and review have been added.'}
                </span>
              </div>
            )}

            {reviewError && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-400/40 text-xs sm:text-sm text-red-200">
                {reviewError}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!reviewComment.trim()) {
                  setReviewError(
                    isUrdu
                      ? 'براہِ کرم بیج کے بارے میں مختصر رائے ضرور لکھیں۔'
                      : 'Please write a short review before submitting.'
                  );
                  return;
                }
                onAddReview(seed.id, {
                  reviewerName:
                    reviewerName.trim() ||
                    (isUrdu ? 'کسان / باغبان' : 'Fellow Farmer'),
                  rating: selectedRating,
                  comment: reviewComment.trim(),
                });
                setReviewerName('');
                setReviewComment('');
                setSelectedRating(5);
                setReviewError('');
                setReviewSavedNotice(true);
                setTimeout(() => setReviewSavedNotice(false), 4000);
              }}
              className="space-y-4"
            >
              {/* 1 to 5 Star Selector */}
              <div>
                <span className="block text-sm font-semibold text-[#FFF0A3] mb-2">
                  {isUrdu ? 'ستاروں کا انتخاب کریں:' : 'Select Rating:'}
                </span>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const filled = star <= (hoverRating || selectedRating);
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setSelectedRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        aria-label={`${star} ${isUrdu ? 'ستارے' : 'stars'}`}
                        className="p-1.5 rounded-lg hover:bg-[#263B20] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5C65A]"
                      >
                        <Star
                          className={`w-7 h-7 transition-colors ${
                            filled
                              ? 'text-[#E5C65A] fill-[#E5C65A]'
                              : 'text-[#44633B]'
                          }`}
                        />
                      </button>
                    );
                  })}
                  <span className="ms-2 text-sm font-bold text-[#FFF0A3] tabular-nums">
                    {selectedRating}/5
                  </span>
                </div>
              </div>

              <div>
                <label
                  htmlFor="reviewer-name"
                  className="block text-sm font-semibold text-[#FFF0A3] mb-1.5"
                >
                  {isUrdu ? 'آپ کا نام (اختیاری)' : 'Your Name (Optional)'}
                </label>
                <input
                  id="reviewer-name"
                  type="text"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  placeholder={
                    isUrdu ? 'مثلاً احمد رضا (ساہیوال)' : 'e.g., Ahmad Raza'
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm text-[#F8F7EA] placeholder:text-[#8BA082] focus:outline-none focus:border-[#E5C65A]"
                />
              </div>

              <div>
                <label
                  htmlFor="review-comment"
                  className="block text-sm font-semibold text-[#FFF0A3] mb-1.5"
                >
                  {isUrdu
                    ? 'بیج کی خالصیت اور اُگاؤ پر رائے *'
                    : 'Review on Seed Purity & Germination *'}
                </label>
                <textarea
                  id="review-comment"
                  rows={3}
                  dir="auto"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder={
                    isUrdu
                      ? 'مثلاً بیج بالکل خالص تھا اور ۹۰ فیصد سے زیادہ اُگاؤ نکلا...'
                      : 'e.g., Seeds were clean and germination exceeded 90%...'
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm text-[#F8F7EA] placeholder:text-[#8BA082] focus:outline-none focus:border-[#E5C65A]"
                />
              </div>

              <button
                type="submit"
                className="min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-sm sm:text-base font-bold transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{isUrdu ? 'رائے جمع کروائیں' : 'Submit Review'}</span>
              </button>
            </form>
          </div>

          {/* Existing Reviews List */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5C65A]/15 pb-3">
              <h3 className="text-lg font-bold text-[#FFF0A3]">
                {isUrdu ? 'کسانوں کی آراء' : 'Farmer Reviews'}
              </h3>
              <span className="text-sm font-semibold text-[#C7D3BD] tabular-nums">
                {reviews.length} {isUrdu ? 'تبصرے' : 'reviews'}
              </span>
            </div>

            {reviews.length > 0 ? (
              <div className="space-y-3">
                {reviews.map((rev) => (
                  <article
                    key={rev.id}
                    className="p-4 rounded-xl bg-[#102B19]/75 border border-[#44633B]/70 space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-sm sm:text-base text-[#FFF0A3]">
                        {rev.reviewerName}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 ${
                                s <= rev.rating
                                  ? 'text-[#E5C65A] fill-[#E5C65A]'
                                  : 'text-[#44633B]'
                              }`}
                              aria-hidden="true"
                            />
                          ))}
                        </span>
                        <span className="text-xs text-[#B7C7AC]">
                          {isUrdu ? rev.dateLabelUr : rev.dateLabelEn}
                        </span>
                      </div>
                    </div>
                    <p
                      dir="auto"
                      className="text-sm text-[#E6ECE0] leading-relaxed"
                    >
                      {rev.comment}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-xl bg-[#102B19]/75 border border-[#44633B]/70 text-center text-sm text-[#C7D3BD]">
                {isUrdu
                  ? 'ابھی تک اس بیج پر کوئی رائے موجود نہیں۔ پہلی رائے آپ دیں!'
                  : 'No reviews yet for this seed. Be the first to review!'}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Fallback Share Dialog (Copy Link, WhatsApp & Facebook) */}
      {isShareDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#08170D]/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-modal-title"
          onClick={() => setIsShareDialogOpen(false)}
        >
          <div
            className="w-full max-w-md bg-[#13311D]/95 backdrop-blur-xl rounded-2xl border border-[#E5C65A]/30 shadow-2xl overflow-hidden text-[#F8F7EA]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 bg-[#1B4227] border-b border-[#E5C65A]/20">
              <div className="flex items-center gap-2.5">
                <Share2 className="w-5 h-5 text-[#E5C65A] shrink-0" aria-hidden="true" />
                <h2 id="share-modal-title" className="text-lg font-bold text-[#FFF0A3]">
                  {isUrdu ? 'بیج کا لنک شیئر کریں' : 'Share Seed Listing'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsShareDialogOpen(false)}
                aria-label={isUrdu ? 'بند کریں' : 'Close'}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-[#F8F7EA] hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3.5 rounded-xl bg-[#263B20]/70 border border-[#E5C65A]/25">
                <div className="font-bold text-sm sm:text-base text-[#FFF0A3]">
                  {seedName}
                </div>
                <div className="text-xs text-[#C7D3BD] mt-0.5">
                  {locationLabel} · {owner}
                </div>
              </div>

              {/* Copy Link Row */}
              <div className="space-y-1.5">
                <label
                  htmlFor="share-seed-url"
                  className="block text-xs sm:text-sm font-semibold text-[#FFF0A3]"
                >
                  {isUrdu ? 'بیج کا براہِ راست لنک:' : 'Direct Seed Link:'}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="share-seed-url"
                    type="text"
                    readOnly
                    dir="ltr"
                    value={seedShareUrl}
                    onFocus={(e) => e.currentTarget.select()}
                    className="flex-1 min-w-0 min-h-[42px] px-3 py-2 rounded-xl bg-[#0D2314] border border-[#44633B] text-xs sm:text-sm text-[#F8F7EA] tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={handleCopyShareLink}
                    className="min-h-[42px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {linkCopied ? (
                      <>
                        <Check className="w-4 h-4 shrink-0" />
                        <span>{isUrdu ? 'کاپی ہو گیا' : 'Copied'}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 shrink-0" />
                        <span>{isUrdu ? 'کاپی کریں' : 'Copy Link'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* WhatsApp, Facebook & Twitter Share Links */}
              <SocialShareBar
                lang={lang}
                title={seedName}
                shareText={shareText}
                shareParams={{ seed: seed.id }}
                labelEn="Share via social media"
                labelUr="سوشل میڈیا پر شیئر کریں"
                variant="inline"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

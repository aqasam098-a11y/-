import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  ExternalLink,
  Home,
  MapPin,
  MessageSquareText,
  Mic,
  PhoneCall,
  Send,
  Sprout,
  Square,
  Trash2,
} from 'lucide-react';
import {
  getInitialSeedChatMessages,
  getSeedMapUrl,
  UI_COPY,
} from '../data/seeds';
import { ChatMessage, Language, SeedItem } from '../types';
import {
  blobToDataUrl,
  formatDuration,
  getCurrentTimestamp,
} from '../utils/media';
import { VoiceMessagePlayer } from './VoiceMessagePlayer';

interface VoiceChatHubViewProps {
  lang: Language;
  seeds: SeedItem[];
  onBackHome: () => void;
  onOpenSeedDetail: (seed: SeedItem, focusChat?: boolean) => void;
  onSelectOwner: (seed: SeedItem) => void;
}

function loadMessagesForSeed(seed: SeedItem): ChatMessage[] {
  try {
    const saved = localStorage.getItem(`desibeej_chat_${seed.id}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Fallback
  }
  return getInitialSeedChatMessages(seed);
}

export function VoiceChatHubView({
  lang,
  seeds,
  onBackHome,
  onOpenSeedDetail,
  onSelectOwner,
}: VoiceChatHubViewProps) {
  const isUrdu = lang === 'ur';
  const t = UI_COPY[lang];

  const [selectedSeedId, setSelectedSeedId] = useState<string>(
    () => seeds[0]?.id || ''
  );
  const selectedSeed = useMemo(
    () => seeds.find((s) => s.id === selectedSeedId) ?? seeds[0] ?? null,
    [seeds, selectedSeedId]
  );

  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    selectedSeed ? loadMessagesForSeed(selectedSeed) : []
  );
  const [textInput, setTextInput] = useState('');
  const [storageWarning, setStorageWarning] = useState('');

  // MediaRecorder state
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
  const cancelFlagRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!selectedSeed) return;
    setMessages(loadMessagesForSeed(selectedSeed));
  }, [selectedSeed]);

  useEffect(() => {
    if (!selectedSeed) return;
    try {
      localStorage.setItem(
        `desibeej_chat_${selectedSeed.id}`,
        JSON.stringify(messages)
      );
      setStorageWarning('');
    } catch {
      setStorageWarning(
        isUrdu
          ? 'براؤزر اسٹوریج بھر جانے کی وجہ سے پرانے پیغامات محفوظ نہیں ہو سکے۔'
          : 'Browser storage limit reached.'
      );
    }
  }, [messages, selectedSeed, isUrdu]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
  }, [messages.length]);

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
    const msg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'buyer',
      type: 'text',
      text: trimmed,
      timestamp: getCurrentTimestamp(),
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, msg]);
    setTextInput('');
  };

  const handleShareWhatsapp = () => {
    if (!selectedSeed) return;
    const formattedPhone = `+${selectedSeed.whatsapp}`;
    const localFormat = selectedSeed.whatsapp.startsWith('92')
      ? `0${selectedSeed.whatsapp.slice(2)}`
      : selectedSeed.whatsapp;
    const ownerName = isUrdu ? selectedSeed.ownerUr : selectedSeed.ownerEn;
    setMessages((prev) => [
      ...prev,
      {
        id: `share-wa-${Date.now()}`,
        sender: 'owner',
        type: 'text',
        text: isUrdu
          ? `میرا واٹس ایپ / فون نمبر (${ownerName}): ${localFormat} (${formattedPhone}) — آپ اب اس نمبر پر واٹس ایپ یا کال کے ذریعے رابطہ کر سکتے ہیں۔`
          : `My WhatsApp / Phone Number (${ownerName}): ${localFormat} (${formattedPhone}) — reach out directly on WhatsApp.`,
        timestamp: getCurrentTimestamp(),
        createdAt: Date.now(),
      },
    ]);
  };

  const handleShareLocation = () => {
    if (!selectedSeed) return;
    const city = isUrdu ? selectedSeed.cityUr : selectedSeed.cityEn;
    const area = selectedSeed.hideExactLocation
      ? ''
      : isUrdu
        ? selectedSeed.areaUr
        : selectedSeed.areaEn;
    const place = area ? `${city} (${area})` : city;
    const mapUrl = getSeedMapUrl(selectedSeed);
    setMessages((prev) => [
      ...prev,
      {
        id: `share-loc-${Date.now()}`,
        sender: 'owner',
        type: 'text',
        text: isUrdu
          ? `میرا مقام: ${place} — نقشے پر دیکھیں: ${mapUrl}`
          : `Shared Location: ${place} — View on Map: ${mapUrl}`,
        timestamp: getCurrentTimestamp(),
        createdAt: Date.now(),
      },
    ]);
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
          ? 'آپ کا براؤزر وائس ریکارڈنگ کو سپورٹ نہیں کرتا۔'
          : 'Your browser does not support voice recording.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];
      cancelFlagRef.current = false;
      recordingSecondsRef.current = 0;
      setRecordingSeconds(0);

      const preferred = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
      ];
      const mimeType = preferred.find((type) =>
        MediaRecorder.isTypeSupported(type)
      );
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          audioChunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = async () => {
        stopTimerAndStream();
        if (cancelFlagRef.current) {
          audioChunksRef.current = [];
          setRecordingState('idle');
          return;
        }
        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        audioChunksRef.current = [];
        if (blob.size === 0) {
          setRecordingState('idle');
          return;
        }
        try {
          const dataUrl = await blobToDataUrl(blob);
          setPendingVoice({
            dataUrl,
            durationSec: Math.max(1, recordingSecondsRef.current),
          });
          setRecordingState('preview');
        } catch {
          setMicError(
            isUrdu
              ? 'وائس میسج محفوظ کرنے میں مسئلہ پیش آیا۔'
              : 'Could not process voice note.'
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
          ? 'مائیکروفون تک رسائی کی اجازت نہیں ملی۔'
          : 'Microphone access was denied.'
      );
    }
  };

  const stopVoiceRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      cancelFlagRef.current = false;
      mediaRecorderRef.current.stop();
    }
  };

  const cancelVoiceRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      cancelFlagRef.current = true;
      mediaRecorderRef.current.stop();
    } else {
      stopTimerAndStream();
      setRecordingState('idle');
    }
    setPendingVoice(null);
  };

  const sendPendingVoice = () => {
    if (!pendingVoice) return;
    setMessages((prev) => [
      ...prev,
      {
        id: `voice-${Date.now()}`,
        sender: 'buyer',
        type: 'voice',
        audioDataUrl: pendingVoice.dataUrl,
        durationSec: pendingVoice.durationSec,
        timestamp: getCurrentTimestamp(),
        createdAt: Date.now(),
      },
    ]);
    setPendingVoice(null);
    setRecordingState('idle');
  };

  const renderMessageText = (text?: string, isBuyer = false) => {
    if (!text) return null;
    const match = text.match(/https:\/\/www\.google\.com\/maps[^\s]+/);
    if (!match) {
      return <p dir="auto" className="whitespace-pre-wrap break-words">{text}</p>;
    }
    const url = match[0];
    const cleanText = text.replace(url, '').trim();
    return (
      <div className="space-y-2">
        <p dir="auto" className="whitespace-pre-wrap break-words">
          {cleanText}
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            isBuyer
              ? 'bg-[#102B19] text-[#FFF0A3] hover:bg-[#193D24]'
              : 'bg-[#263B20] border border-[#E5C65A]/40 text-[#FFF0A3] hover:bg-[#314B29]'
          }`}
        >
          <MapPin className="w-3.5 h-3.5 shrink-0 text-[#E5C65A]" />
          <span>{t.viewOnMapBtn}</span>
          <ExternalLink className="w-3 h-3 shrink-0" />
        </a>
      </div>
    );
  };

  return (
    <div className="bg-[#102B19] text-[#F8F7EA] min-h-[calc(100vh-4rem)]">
      {/* Header Banner */}
      <section className="border-b border-[#44633B]/60 bg-gradient-to-b from-[#1A3B24] to-[#102B19]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <nav aria-label={isUrdu ? 'بریڈ کرمب' : 'Breadcrumb'}>
              <ol className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-[#C7D3BD]">
                <li>
                  <button
                    type="button"
                    onClick={onBackHome}
                    className="inline-flex items-center gap-1.5 text-[#E5C65A] hover:text-[#FFF0A3] hover:underline font-semibold cursor-pointer"
                  >
                    <Home className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{t.breadcrumbHome}</span>
                  </button>
                </li>
                <li aria-hidden="true" className="text-[#8DA182]">
                  &gt;
                </li>
                <li className="text-[#FFF0A3] font-semibold">
                  {t.navChatHub}
                </li>
              </ol>
            </nav>

            <button
              type="button"
              onClick={onBackHome}
              className="min-h-[40px] inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#44633B] bg-[#13311D] hover:bg-[#263B20] text-xs sm:text-sm font-semibold text-[#FFF0A3] transition-colors cursor-pointer"
            >
              <span>{t.backToHome}</span>
            </button>
          </div>

          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-[#E5C65A] mb-1">
              <MessageSquareText className="w-4 h-4 shrink-0" />
              <span>
                {isUrdu
                  ? 'کسانوں سے براہِ راست گفتگو'
                  : 'Direct Farmer Messaging'}
              </span>
            </div>
            <h1
              className={`font-bold text-[#FFF0A3] ${
                isUrdu
                  ? 'font-urdu-display text-2xl sm:text-3xl leading-[2.05]'
                  : 'font-display-heading text-2xl sm:text-3xl font-bold tracking-tight'
              }`}
            >
              {t.navChatHub}
            </h1>
            <p className="text-sm text-[#D7E2CE] mt-1">
              {isUrdu
                ? 'کسی بھی بیج کا انتخاب کریں اور اس کے مالک سے اردو یا انگلش میں ٹیکسٹ یا وائس میسج کے ذریعے بات کریں۔'
                : 'Pick any seed conversation below to send text or MediaRecorder voice notes directly to the grower.'}
            </p>
          </div>
        </div>
      </section>

      {/* Main Split Workspace */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Seed Conversations List */}
          <aside className="lg:col-span-4 agri-glass rounded-2xl overflow-hidden">
            <div className="px-4 py-3.5 bg-[#263B20]/80 border-b border-[#44633B]/70 flex items-center justify-between">
              <h2 className="text-sm sm:text-base font-bold text-[#FFF0A3]">
                {isUrdu ? 'بیج گفتگو فہرست' : 'Seed Conversations'}
              </h2>
              <span className="text-xs font-bold text-[#E5C65A] tabular-nums">
                {seeds.length}
              </span>
            </div>
            <div className="divide-y divide-[#44633B]/45 max-h-[540px] overflow-y-auto">
              {seeds.map((seed) => {
                const active = selectedSeed?.id === seed.id;
                const seedThread = loadMessagesForSeed(seed);
                const lastMsg = seedThread[seedThread.length - 1];
                return (
                  <button
                    key={seed.id}
                    type="button"
                    onClick={() => setSelectedSeedId(seed.id)}
                    className={`w-full p-3.5 text-start transition-colors cursor-pointer flex items-start gap-3 ${
                      active
                        ? 'bg-[#263B20] border-s-4 border-[#E5C65A]'
                        : 'hover:bg-[#163621]'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#FFF0A3]/15 border border-[#E5C65A]/30 text-[#E5C65A] flex items-center justify-center shrink-0">
                      <Sprout className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm text-[#F8F7EA] truncate">
                          {isUrdu ? seed.nameUr : seed.nameEn}
                        </span>
                        <span className="text-[11px] font-semibold text-[#E5C65A] tabular-nums shrink-0">
                          {seedThread.length}
                        </span>
                      </div>
                      <div className="text-xs text-[#C7D3BD] truncate mt-0.5">
                        {isUrdu ? seed.ownerUr : seed.ownerEn} ·{' '}
                        {isUrdu ? seed.cityUr : seed.cityEn}
                      </div>
                      {lastMsg && (
                        <div className="text-xs text-[#A5B89B] truncate mt-1">
                          {lastMsg.type === 'voice'
                            ? isUrdu
                              ? '🎤 وائس میسج'
                              : '🎤 Voice note'
                            : lastMsg.text}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Active Chat Box */}
          {selectedSeed && (
            <section className="lg:col-span-8 agri-glass-elevated rounded-2xl flex flex-col overflow-hidden">
              <div className="px-5 py-4 bg-[#263B20] border-b border-[#E5C65A]/25 text-[#F8F7EA] flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-bold text-[#FFF0A3] truncate">
                    {isUrdu ? selectedSeed.nameUr : selectedSeed.nameEn}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#D7E2CE] mt-0.5">
                    <button
                      type="button"
                      onClick={() => onSelectOwner(selectedSeed)}
                      className="hover:underline text-[#E5C65A] cursor-pointer font-semibold"
                    >
                      {isUrdu ? selectedSeed.ownerUr : selectedSeed.ownerEn}
                    </button>
                    <span>·</span>
                    <span>
                      {isUrdu ? selectedSeed.cityUr : selectedSeed.cityEn}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenSeedDetail(selectedSeed, true)}
                  className="min-h-[36px] px-3.5 py-1.5 rounded-lg bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-xs font-bold transition-colors cursor-pointer"
                >
                  {isUrdu ? 'بیج کی مکمل تفصیل' : 'Full Seed Details'}
                </button>
              </div>

              {/* Chat Thread */}
              <div className="flex-1 min-h-[340px] max-h-[430px] overflow-y-auto p-4 sm:p-5 space-y-4 bg-[#0D2314]">
                {messages.map((msg) => {
                  const isBuyer = msg.sender === 'buyer';
                  const ownerLabel = isUrdu
                    ? selectedSeed.ownerUr
                    : selectedSeed.ownerEn;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        isBuyer ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-[11px] font-medium text-[#C7D3BD] mb-1 px-1">
                        <span>
                          {isBuyer ? (isUrdu ? 'آپ' : 'You') : ownerLabel}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span dir="ltr" className="tabular-nums">
                          {msg.timestamp}
                        </span>
                      </div>

                      <div
                        className={`max-w-[88%] sm:max-w-[80%] rounded-2xl px-4 py-3 text-sm sm:text-base leading-relaxed ${
                          isBuyer
                            ? 'bg-[#E5C65A] text-[#102B19] font-medium rounded-be-sm'
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
                        ) : (
                          renderMessageText(msg.text, isBuyer)
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {(micError || storageWarning) && (
                <div className="px-4 py-2.5 bg-red-950/60 border-t border-red-400/40 text-xs sm:text-sm text-red-200">
                  {micError || storageWarning}
                </div>
              )}

              {recordingState === 'recording' && (
                <div className="px-4 py-3 bg-[#263B20] border-t border-[#E5C65A]/40 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                    <span className="text-sm font-semibold text-[#FFF0A3]">
                      {isUrdu
                        ? 'وائس میسج ریکارڈ ہو رہا ہے...'
                        : 'Recording voice note...'}
                    </span>
                    <span
                      dir="ltr"
                      className="text-sm font-bold text-[#E5C65A] tabular-nums"
                    >
                      {formatDuration(recordingSeconds)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={cancelVoiceRecording}
                      className="min-h-[36px] px-3 py-1 rounded-lg border border-[#44633B] bg-[#13311D] text-[#F8F7EA] text-xs font-semibold cursor-pointer"
                    >
                      {isUrdu ? 'منسوخ' : 'Cancel'}
                    </button>
                    <button
                      type="button"
                      onClick={stopVoiceRecording}
                      className="min-h-[36px] inline-flex items-center gap-1.5 px-3.5 py-1 rounded-lg bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-xs font-bold cursor-pointer"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>{isUrdu ? 'روکیں' : 'Stop'}</span>
                    </button>
                  </div>
                </div>
              )}

              {recordingState === 'preview' && pendingVoice && (
                <div className="px-4 py-3 bg-[#183822] border-t border-[#44633B] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                      onClick={() => {
                        setPendingVoice(null);
                        setRecordingState('idle');
                      }}
                      className="min-h-[38px] inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-400/40 bg-red-950/50 text-xs font-semibold text-red-200 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>{isUrdu ? 'حذف' : 'Discard'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={sendPendingVoice}
                      className="min-h-[38px] inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-xs sm:text-sm font-bold cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span>
                        {isUrdu ? 'وائس میسج بھیجیں' : 'Send Voice'}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Quick Actions: Share Location & Share WhatsApp */}
              <div className="px-4 py-2.5 bg-[#13311D] border-t border-[#44633B]/70 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium text-[#C7D3BD]">
                  {isUrdu ? 'فوری شیئرنگ:' : 'Quick share:'}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleShareLocation}
                    className="min-h-[34px] inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#263B20] hover:bg-[#314B29] border border-[#E5C65A]/40 text-xs font-semibold text-[#FFF0A3] cursor-pointer transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5 shrink-0 text-[#E5C65A]" />
                    <span>{t.shareLocationInChatBtn}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleShareWhatsapp}
                    className="min-h-[34px] inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#263B20] hover:bg-[#314B29] border border-[#44633B] text-xs font-semibold text-[#F8F7EA] cursor-pointer transition-colors"
                  >
                    <PhoneCall className="w-3.5 h-3.5 shrink-0 text-[#E5C65A]" />
                    <span>{t.sharePhoneInChatBtn}</span>
                  </button>
                </div>
              </div>

              {/* Composer */}
              <form
                onSubmit={handleSendText}
                className="p-3 sm:p-4 bg-[#102B19] border-t border-[#44633B]/70 flex items-center gap-2"
              >
                <input
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
                  className="flex-1 min-w-0 min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm text-[#F8F7EA] placeholder:text-[#8DA182] focus:outline-none focus:border-[#E5C65A]"
                />
                <button
                  type="button"
                  onClick={
                    recordingState === 'recording'
                      ? stopVoiceRecording
                      : startVoiceRecording
                  }
                  disabled={recordingState === 'preview'}
                  className={`min-h-[44px] inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    recordingState === 'recording'
                      ? 'bg-red-600 border-red-500 text-white'
                      : 'bg-[#263B20] border-[#E5C65A]/45 text-[#FFF0A3] hover:bg-[#314B29]'
                  }`}
                >
                  <Mic className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">
                    {isUrdu ? 'وائس میسج' : 'Voice'}
                  </span>
                </button>
                <button
                  type="submit"
                  disabled={!textInput.trim() || recordingState === 'recording'}
                  className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] disabled:bg-[#263B20] disabled:text-[#8DA182] text-[#102B19] text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                >
                  <Send className="w-4 h-4 shrink-0" />
                  <span>{isUrdu ? 'بھیجیں' : 'Send'}</span>
                </button>
              </form>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

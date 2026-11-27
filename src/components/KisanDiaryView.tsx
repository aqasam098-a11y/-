import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Heart,
  Home,
  ImagePlus,
  MapPin,
  MessageSquare,
  Mic,
  Plus,
  Send,
  Square,
  Trash2,
  User,
  X,
} from 'lucide-react';
import {
  DIARY_TOPICS,
  PAKISTANI_CITIES,
  UI_COPY,
} from '../data/seeds';
import {
  DiaryComment,
  DiaryPost,
  DiaryTopicId,
  FarmerProfile,
  Language,
} from '../types';
import {
  blobToDataUrl,
  compressImageToDataUrl,
  formatDuration,
  getCurrentTimestamp,
} from '../utils/media';
import { VoiceMessagePlayer } from './VoiceMessagePlayer';

interface KisanDiaryViewProps {
  lang: Language;
  posts: DiaryPost[];
  myProfile: FarmerProfile;
  storageWarning?: string;
  onAddPost: (post: DiaryPost) => void;
  onToggleLike: (postId: string) => void;
  onAddComment: (postId: string, comment: DiaryComment) => void;
  onSelectAuthor: (post: DiaryPost) => void;
  onBackHome?: () => void;
}

export function KisanDiaryView({
  lang,
  posts,
  myProfile,
  storageWarning = '',
  onAddPost,
  onToggleLike,
  onAddComment,
  onSelectAuthor,
  onBackHome,
}: KisanDiaryViewProps) {
  const isUrdu = lang === 'ur';
  const t = UI_COPY[lang];

  const [activeTopic, setActiveTopic] = useState<DiaryTopicId>('all');
  const [isWriteOpen, setIsWriteOpen] = useState(false);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [commentAuthorInputs, setCommentAuthorInputs] = useState<
    Record<string, string>
  >({});
  const [expandedComments, setExpandedComments] = useState<
    Record<string, boolean>
  >({});

  // Write Diary Form State
  const [title, setTitle] = useState('');
  const [topic, setTopic] =
    useState<Exclude<DiaryTopicId, 'all'>>('organic_fertilizer');
  const [author, setAuthor] = useState('');
  const [cityIndex, setCityIndex] = useState(0);
  const [content, setContent] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState('');
  const [imageName, setImageName] = useState('');
  const [formError, setFormError] = useState('');
  const [justPublished, setJustPublished] = useState(false);

  // Voice Note Recorder State inside Write Diary Form
  const [recordingState, setRecordingState] = useState<
    'idle' | 'recording' | 'preview'
  >('idle');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceNote, setVoiceNote] = useState<{
    dataUrl: string;
    durationSec: number;
  } | null>(null);
  const [micError, setMicError] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const recordingSecondsRef = useRef(0);
  const cancelFlagRef = useRef(false);

  useEffect(() => {
    if (!isWriteOpen) return;
    setAuthor((prev) => prev || (isUrdu ? myProfile.nameUr : myProfile.nameEn));
    const idx = PAKISTANI_CITIES.findIndex(
      (c) => c.ur === myProfile.cityUr || c.en === myProfile.cityEn
    );
    if (idx >= 0) {
      setCityIndex(idx);
    }
  }, [isWriteOpen, myProfile, isUrdu]);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const stopTimerAndStream = () => {
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
  };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFormError(
        isUrdu
          ? 'براہِ کرم صرف تصویر کی فائل منتخب کریں۔'
          : 'Please choose a valid image file.'
      );
      return;
    }
    try {
      const compressed = await compressImageToDataUrl(file);
      setImageDataUrl(compressed);
      setImageName(file.name);
      setFormError('');
    } catch {
      setFormError(
        isUrdu
          ? 'تصویر لوڈ کرنے میں مسئلہ پیش آیا۔'
          : 'Could not load image.'
      );
    }
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
          setVoiceNote({
            dataUrl,
            durationSec: Math.max(1, recordingSecondsRef.current),
          });
          setRecordingState('preview');
        } catch {
          setMicError(
            isUrdu
              ? 'وائس نوٹ محفوظ کرنے میں مسئلہ پیش آیا۔'
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
          : 'Microphone permission was denied.'
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
    setVoiceNote(null);
  };

  const handlePublishPost = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !author.trim() || !content.trim()) {
      setFormError(
        isUrdu
          ? 'براہِ کرم عنوان، اپنا نام اور تحریر لازمی درج کریں۔'
          : 'Please enter a title, your name, and your diary entry.'
      );
      return;
    }

    const selectedCity = PAKISTANI_CITIES[cityIndex] || PAKISTANI_CITIES[0];
    const now = new Date();
    const dateUr = now.toLocaleDateString('ur-PK', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const dateEn = now.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    const newPost: DiaryPost = {
      id: `diary-${Date.now()}`,
      ownerId: myProfile.id,
      titleUr: title.trim(),
      titleEn: title.trim(),
      topic,
      contentUr: content.trim(),
      contentEn: content.trim(),
      authorUr: author.trim(),
      authorEn: author.trim(),
      cityUr: selectedCity.ur,
      cityEn: selectedCity.en,
      dateUr,
      dateEn,
      imageUrl: imageDataUrl || undefined,
      voiceDataUrl: voiceNote?.dataUrl,
      voiceDurationSec: voiceNote?.durationSec,
      likes: 0,
      likedByMe: false,
      comments: [],
      createdAt: Date.now(),
    };

    onAddPost(newPost);
    setActiveTopic('all');
    setTitle('');
    setAuthor('');
    setContent('');
    setImageDataUrl('');
    setImageName('');
    setVoiceNote(null);
    setRecordingState('idle');
    setFormError('');
    setIsWriteOpen(false);
    setJustPublished(true);
    setTimeout(() => setJustPublished(false), 4500);
  };

  const handleAddComment = (e: FormEvent, postId: string) => {
    e.preventDefault();
    const text = (commentInputs[postId] || '').trim();
    if (!text) return;
    const authorName =
      (commentAuthorInputs[postId] || '').trim() ||
      (isUrdu ? 'مہمان کسان' : 'Guest Farmer');

    const newComment: DiaryComment = {
      id: `dc-${Date.now()}`,
      authorName,
      text,
      timestamp: getCurrentTimestamp(),
      createdAt: Date.now(),
    };

    onAddComment(postId, newComment);
    setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
    setExpandedComments((prev) => ({ ...prev, [postId]: true }));
  };

  const filteredPosts =
    activeTopic === 'all'
      ? posts
      : posts.filter((p) => p.topic === activeTopic);

  const selectableTopics = DIARY_TOPICS.filter((item) => item.id !== 'all');

  return (
    <div className="bg-[#102B19] text-[#F8F7EA] min-h-[calc(100vh-4rem)]">
      {/* Kisan Diary Header Banner */}
      <section className="border-b border-[#E5C65A]/20 bg-gradient-to-b from-[#263B20]/70 to-[#102B19]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          {onBackHome && (
            <nav aria-label={isUrdu ? 'بریڈ کرمب' : 'Breadcrumb'} className="mb-4">
              <ol className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-[#C7D3BD]">
                <li>
                  <button
                    type="button"
                    onClick={onBackHome}
                    className="inline-flex items-center gap-1.5 text-[#FFF0A3] hover:underline font-semibold cursor-pointer"
                  >
                    <Home className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{t.breadcrumbHome}</span>
                  </button>
                </li>
                <li aria-hidden="true" className="text-[#E5C65A]/60">
                  &gt;
                </li>
                <li className="text-[#F8F7EA] font-semibold">
                  {t.navKisanDiary}
                </li>
              </ol>
            </nav>
          )}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-[#E5C65A] mb-2">
                <BookOpen className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>
                  {isUrdu
                    ? 'کسانوں اور باغبانوں کا تجربہ گاہ'
                    : 'Community Farming Journal'}
                </span>
              </div>
              <h1
                className={`font-bold text-[#FFF0A3] mb-3 ${
                  isUrdu
                    ? 'font-urdu-display text-2xl sm:text-3xl lg:text-4xl leading-[2.1]'
                    : 'font-display-heading text-3xl sm:text-4xl font-bold tracking-tight'
                }`}
              >
                {isUrdu
                  ? 'کسان ڈائری — دیسی زراعت اور تجربات'
                  : 'Kisan Diary — Traditional Farming Notes'}
              </h1>
              <p className="text-sm sm:text-base text-[#D7E2CE] leading-relaxed">
                {isUrdu
                  ? 'یہاں کسان اور گھریلو باغبان زمین کی تیاری، دیسی کھاد، کیڑوں سے قدرتی بچاؤ اور بیج محفوظ کرنے کے اپنے آزمودہ طریقے بانٹتے ہیں۔'
                  : 'Share practical experiences on soil preparation, organic compost, natural pest control, and traditional heirloom seed saving.'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsWriteOpen((prev) => !prev)}
              className="min-h-[46px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-sm sm:text-base font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>
                {isUrdu ? '+ ڈائری میں لکھیں' : '+ Write in Diary'}
              </span>
            </button>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {justPublished && (
          <div
            role="status"
            className="p-4 rounded-xl bg-[#263B20] border border-[#E5C65A]/45 flex items-center justify-between gap-3 text-[#FFF0A3]"
          >
            <div className="flex items-center gap-2 text-sm sm:text-base font-semibold">
              <CheckCircle2 className="w-5 h-5 text-[#E5C65A] shrink-0" aria-hidden="true" />
              <span>
                {isUrdu
                  ? 'آپ کی تحریر کسان ڈائری میں کامیابی سے شائع ہو گئی ہے۔'
                  : 'Your diary entry has been published.'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setJustPublished(false)}
              className="p-1 rounded-lg hover:bg-white/10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {storageWarning && (
          <div className="p-3 rounded-xl bg-red-950/60 border border-red-400/40 text-sm text-red-200">
            {storageWarning}
          </div>
        )}

        {/* Write Diary Form Panel */}
        {isWriteOpen && (
          <section
            aria-label={isUrdu ? 'ڈائری میں نئی تحریر' : 'New Diary Entry'}
            className="agri-glass-elevated rounded-2xl overflow-hidden"
          >
            <div className="px-5 py-4 bg-[#1B4227] border-b border-[#E5C65A]/20 text-[#FFF0A3] flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-bold">
                {isUrdu
                  ? 'اپنا زرعی تجربہ کسان ڈائری میں لکھیں'
                  : 'Share Your Farming Experience'}
              </h2>
              <button
                type="button"
                onClick={() => setIsWriteOpen(false)}
                aria-label={isUrdu ? 'بند کریں' : 'Close'}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePublishPost} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-400/40 text-sm text-red-200">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-8">
                  <label
                    htmlFor="diary-title"
                    className="block text-sm font-semibold text-[#FFF0A3] mb-1.5"
                  >
                    {isUrdu ? 'عنوان *' : 'Title *'}
                  </label>
                  <input
                    id="diary-title"
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={
                      isUrdu
                        ? 'مثلاً گندم کی بوائی سے پہلے زمین کی تیاری'
                        : 'e.g., Preparing soil before wheat sowing'
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm text-[#F8F7EA] placeholder:text-[#8BA082] focus:outline-none focus:border-[#E5C65A]"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label
                    htmlFor="diary-topic"
                    className="block text-sm font-semibold text-[#FFF0A3] mb-1.5"
                  >
                    {isUrdu ? 'موضوع منتخب کریں' : 'Topic'}
                  </label>
                  <select
                    id="diary-topic"
                    value={topic}
                    onChange={(e) =>
                      setTopic(e.target.value as Exclude<DiaryTopicId, 'all'>)
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm text-[#F8F7EA] focus:outline-none focus:border-[#E5C65A]"
                  >
                    {selectableTopics.map((item) => (
                      <option key={item.id} value={item.id}>
                        {isUrdu ? item.ur : item.en}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="diary-author"
                    className="block text-sm font-semibold text-[#FFF0A3] mb-1.5"
                  >
                    {isUrdu ? 'مصنف کا نام *' : 'Your Name *'}
                  </label>
                  <input
                    id="diary-author"
                    type="text"
                    required
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder={isUrdu ? 'مثلاً چوہدری اسلم' : 'e.g., Chaudhry Aslam'}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm text-[#F8F7EA] placeholder:text-[#8BA082] focus:outline-none focus:border-[#E5C65A]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="diary-city"
                    className="block text-sm font-semibold text-[#FFF0A3] mb-1.5"
                  >
                    {isUrdu ? 'شہر / ضلع' : 'City / District'}
                  </label>
                  <select
                    id="diary-city"
                    value={cityIndex}
                    onChange={(e) => setCityIndex(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm text-[#F8F7EA] focus:outline-none focus:border-[#E5C65A]"
                  >
                    {PAKISTANI_CITIES.map((c, idx) => (
                      <option key={c.en} value={idx}>
                        {isUrdu ? c.ur : c.en}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="diary-content"
                  className="block text-sm font-semibold text-[#FFF0A3] mb-1.5"
                >
                  {isUrdu ? 'تحریر / مشورہ (اردو یا انگلش) *' : 'Experience / Tip *'}
                </label>
                <textarea
                  id="diary-content"
                  rows={4}
                  required
                  dir="auto"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={
                    isUrdu
                      ? 'اپنا آزمودہ طریقہ، دیسی کھاد کا فارمولا یا فصل کا تجربہ تفصیل سے لکھیں...'
                      : 'Share your farming tips, compost recipe, or seed-saving advice...'
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm sm:text-base text-[#F8F7EA] placeholder:text-[#8BA082] leading-relaxed focus:outline-none focus:border-[#E5C65A]"
                />
              </div>

              {/* Optional Photo & Optional Voice Note */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="block text-sm font-semibold text-[#FFF0A3] mb-1.5">
                    {isUrdu ? 'تصویر (اختیاری)' : 'Photo (Optional)'}
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="sr-only"
                  />
                  {imageDataUrl ? (
                    <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[#0D2314] border border-[#44633B]">
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={imageDataUrl}
                          alt="Diary attachment"
                          className="w-12 h-10 rounded-lg object-cover shrink-0"
                        />
                        <span className="text-xs text-[#D7E2CE] truncate">
                          {imageName || (isUrdu ? 'تصویر منسلک' : 'Attached')}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setImageDataUrl('');
                          setImageName('');
                        }}
                        className="p-1.5 text-red-300 hover:bg-red-950/60 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-dashed border-[#E5C65A]/45 bg-[#0D2314]/80 hover:bg-[#102B19] text-xs sm:text-sm font-semibold text-[#FFF0A3] cursor-pointer"
                    >
                      <ImagePlus className="w-4 h-4 text-[#E5C65A] shrink-0" />
                      <span>
                        {isUrdu ? 'تصویر شامل کریں' : 'Upload Photo'}
                      </span>
                    </button>
                  )}
                </div>

                <div>
                  <span className="block text-sm font-semibold text-[#FFF0A3] mb-1.5">
                    {isUrdu ? 'وائس نوٹ (اختیاری)' : 'Voice Note (Optional)'}
                  </span>
                  {recordingState === 'idle' && (
                    <button
                      type="button"
                      onClick={startVoiceRecording}
                      className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-[#E5C65A]/40 bg-[#263B20] hover:bg-[#314C29] text-xs sm:text-sm font-semibold text-[#FFF0A3] cursor-pointer"
                    >
                      <Mic className="w-4 h-4 text-[#E5C65A] shrink-0" />
                      <span>
                        {isUrdu ? 'وائس نوٹ ریکارڈ کریں' : 'Record Voice Note'}
                      </span>
                    </button>
                  )}

                  {recordingState === 'recording' && (
                    <div className="min-h-[44px] px-3 py-2 rounded-xl bg-[#263B20] border border-[#E5C65A]/45 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                        <span
                          dir="ltr"
                          className="text-xs font-bold tabular-nums text-[#FFF0A3]"
                        >
                          {formatDuration(recordingSeconds)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={cancelVoiceRecording}
                          className="px-2 py-1 rounded text-xs font-semibold text-[#C7D3BD] hover:bg-[#102B19] cursor-pointer"
                        >
                          {isUrdu ? 'منسوخ' : 'Cancel'}
                        </button>
                        <button
                          type="button"
                          onClick={stopVoiceRecording}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#E5C65A] text-[#102B19] text-xs font-bold cursor-pointer"
                        >
                          <Square className="w-3 h-3 fill-current" />
                          <span>{isUrdu ? 'روکیں' : 'Stop'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {recordingState === 'preview' && voiceNote && (
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#1B4227] border border-[#E5C65A]/30">
                      <div className="flex-1 min-w-0">
                        <VoiceMessagePlayer
                          src={voiceNote.dataUrl}
                          initialDuration={voiceNote.durationSec}
                          variant="preview"
                          isUrdu={isUrdu}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setVoiceNote(null);
                          setRecordingState('idle');
                        }}
                        className="p-1.5 text-red-300 hover:bg-red-950/60 rounded-lg cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {micError && (
                <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-400/40 text-xs sm:text-sm text-red-200">
                  {micError}
                </div>
              )}

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  className="min-h-[44px] inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-sm sm:text-base font-bold transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{isUrdu ? 'ڈائری میں شائع کریں' : 'Publish Entry'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsWriteOpen(false)}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl border border-[#44633B] bg-[#183822] hover:bg-[#263B20] text-sm font-semibold text-[#F8F7EA] cursor-pointer"
                >
                  {isUrdu ? 'بند کریں' : 'Close'}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Topic Filter Bar */}
        <div
          role="group"
          aria-label={isUrdu ? 'ڈائری کے موضوعات' : 'Diary Topics'}
          className="flex flex-wrap items-center gap-2"
        >
          {DIARY_TOPICS.map((item) => {
            const active = activeTopic === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTopic(item.id)}
                aria-pressed={active}
                className={`min-h-[40px] px-4 py-2 rounded-xl border text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#E5C65A] border-[#E5C65A] text-[#102B19]'
                    : 'bg-[#183822]/80 border-[#44633B] text-[#E6ECE0] hover:border-[#E5C65A]/60 hover:text-[#FFF0A3]'
                }`}
              >
                {isUrdu ? item.ur : item.en}
              </button>
            );
          })}
        </div>

        {/* Social-Style Diary Feed */}
        <div className="space-y-6">
          {filteredPosts.map((post) => {
            const topicMeta = DIARY_TOPICS.find((t) => t.id === post.topic);
            const topicLabel = topicMeta
              ? isUrdu
                ? topicMeta.ur
                : topicMeta.en
              : '';
            const showAllComments = expandedComments[post.id] ?? true;

            return (
              <article
                key={post.id}
                className="agri-glass-elevated rounded-2xl overflow-hidden"
              >
                <div className="p-5 sm:p-6 space-y-4">
                  {/* Author Header & Topic Metadata */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => onSelectAuthor(post)}
                        title={isUrdu ? 'کسان پروفائل دیکھیں' : 'View Kisan Profile'}
                        className="w-10 h-10 rounded-full bg-[#FFF0A3] hover:bg-[#E5C65A] text-[#102B19] flex items-center justify-center font-bold shrink-0 cursor-pointer transition-colors"
                      >
                        <User className="w-5 h-5" aria-hidden="true" />
                      </button>
                      <div>
                        <button
                          type="button"
                          onClick={() => onSelectAuthor(post)}
                          title={isUrdu ? 'کسان پروفائل دیکھیں' : 'View Kisan Profile'}
                          className="text-sm sm:text-base font-bold text-[#FFF0A3] hover:underline underline-offset-4 text-start cursor-pointer"
                        >
                          {isUrdu ? post.authorUr : post.authorEn}
                        </button>
                        <div className="flex items-center gap-2 text-xs text-[#C7D3BD]">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-[#E5C65A]" />
                            {isUrdu ? post.cityUr : post.cityEn}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{isUrdu ? post.dateUr : post.dateEn}</span>
                        </div>
                      </div>
                    </div>

                    <span className="text-xs font-semibold text-[#FFF0A3] bg-[#263B20] border border-[#E5C65A]/35 px-2.5 py-1 rounded-md whitespace-nowrap">
                      {topicLabel}
                    </span>
                  </div>

                  {/* Title & Prose */}
                  <div className="space-y-2">
                    <h2 className="text-lg sm:text-xl font-bold text-[#F8F7EA] leading-snug">
                      {isUrdu ? post.titleUr : post.titleEn}
                    </h2>
                    <p
                      dir="auto"
                      className="text-sm sm:text-base text-[#D7E2CE] leading-relaxed whitespace-pre-line"
                    >
                      {isUrdu ? post.contentUr : post.contentEn}
                    </p>
                  </div>

                  {/* Optional Photo */}
                  {post.imageUrl && (
                    <div className="rounded-xl overflow-hidden border border-[#44633B]/70 bg-[#263B20] max-h-[360px]">
                      <img
                        src={post.imageUrl}
                        alt={isUrdu ? post.titleUr : post.titleEn}
                        referrerPolicy="no-referrer"
                        className="w-full h-full max-h-[360px] object-cover"
                      />
                    </div>
                  )}

                  {/* Optional Voice Note */}
                  {post.voiceDataUrl && (
                    <div className="p-3 rounded-xl bg-[#102B19]/75 border border-[#44633B]/70 max-w-md">
                      <VoiceMessagePlayer
                        src={post.voiceDataUrl}
                        initialDuration={post.voiceDurationSec}
                        variant="owner"
                        isUrdu={isUrdu}
                      />
                    </div>
                  )}

                  {/* Like & Comment Action Bar */}
                  <div className="pt-3 border-t border-[#E5C65A]/15 flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => onToggleLike(post.id)}
                      className={`min-h-[40px] inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                        post.likedByMe
                          ? 'bg-[#E5C65A] border-[#E5C65A] text-[#102B19]'
                          : 'bg-[#102B19]/75 border-[#44633B] text-[#E6ECE0] hover:border-[#E5C65A]/60'
                      }`}
                    >
                      <Heart
                        className={`w-4 h-4 shrink-0 ${
                          post.likedByMe
                            ? 'fill-[#102B19] text-[#102B19]'
                            : 'text-[#E5C65A]'
                        }`}
                        aria-hidden="true"
                      />
                      <span>{isUrdu ? 'پسند' : 'Like'}</span>
                      <span className="tabular-nums">({post.likes})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedComments((prev) => ({
                          ...prev,
                          [post.id]: !showAllComments,
                        }))
                      }
                      className="min-h-[40px] inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-[#44633B] bg-[#102B19]/75 hover:border-[#E5C65A]/60 text-xs sm:text-sm font-semibold text-[#E6ECE0] transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4 text-[#E5C65A] shrink-0" />
                      <span>{isUrdu ? 'تبصرے' : 'Comments'}</span>
                      <span className="tabular-nums">
                        ({post.comments.length})
                      </span>
                    </button>
                  </div>

                  {/* Comments Thread & Inline Comment Box */}
                  {showAllComments && (
                    <div className="pt-3 space-y-3">
                      {post.comments.length > 0 && (
                        <div className="space-y-2.5">
                          {post.comments.map((c) => (
                            <div
                              key={c.id}
                              className="p-3 rounded-xl bg-[#102B19]/75 border border-[#44633B]/60 text-sm"
                            >
                              <div className="flex items-center justify-between gap-2 text-xs text-[#C7D3BD] mb-1">
                                <span className="font-bold text-[#FFF0A3]">
                                  {c.authorName}
                                </span>
                                <span dir="ltr" className="tabular-nums">
                                  {c.timestamp}
                                </span>
                              </div>
                              <p dir="auto" className="text-[#E6ECE0] leading-relaxed">
                                {c.text}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      <form
                        onSubmit={(e) => handleAddComment(e, post.id)}
                        className="flex flex-col sm:flex-row gap-2"
                      >
                        <input
                          type="text"
                          value={commentAuthorInputs[post.id] || ''}
                          onChange={(e) =>
                            setCommentAuthorInputs((prev) => ({
                              ...prev,
                              [post.id]: e.target.value,
                            }))
                          }
                          placeholder={
                            isUrdu ? 'آپ کا نام (اختیاری)' : 'Your name (optional)'
                          }
                          className="sm:w-40 min-h-[40px] px-3 py-2 rounded-xl bg-[#0D2314] border border-[#44633B] text-xs sm:text-sm text-[#F8F7EA] placeholder:text-[#8BA082] focus:outline-none focus:border-[#E5C65A]"
                        />
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            type="text"
                            dir="auto"
                            value={commentInputs[post.id] || ''}
                            onChange={(e) =>
                              setCommentInputs((prev) => ({
                                ...prev,
                                [post.id]: e.target.value,
                              }))
                            }
                            placeholder={
                              isUrdu
                                ? 'اپنا تبصرہ یا سوال لکھیں...'
                                : 'Write a comment or question...'
                            }
                            className="flex-1 min-w-0 min-h-[40px] px-3 py-2 rounded-xl bg-[#0D2314] border border-[#44633B] text-xs sm:text-sm text-[#F8F7EA] placeholder:text-[#8BA082] focus:outline-none focus:border-[#E5C65A]"
                          />
                          <button
                            type="submit"
                            className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{isUrdu ? 'تبصرہ' : 'Post'}</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

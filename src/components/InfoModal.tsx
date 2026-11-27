import { Sprout, X } from 'lucide-react';
import { InfoModalTopic, Language } from '../types';

interface InfoModalProps {
  topic: InfoModalTopic;
  lang: Language;
  onClose: () => void;
}

export function InfoModal({ topic, lang, onClose }: InfoModalProps) {
  if (!topic) return null;
  const isUrdu = lang === 'ur';

  const contentMap: Record<
    Exclude<InfoModalTopic, null>,
    { title: string; paragraphs: string[] }
  > = {
    about: {
      title: isUrdu
        ? 'دیسی بیج ایکسچینج کے بارے میں'
        : 'About Desi Beej Exchange',
      paragraphs: isUrdu
        ? [
            'دیسی بیج ایکسچینج کسانوں، گھریلو باغبانوں اور بیج محافظوں کے لیے ایک جدید زرعی منڈی ہے جو پاکستان بھر میں خالص غیر ترمیم شدہ دیسی بیجوں کے تحفظ اور براہِ راست تبادلے کو فروغ دیتی ہے۔',
            'ہماری کوشش ہے کہ کسان بغیر کسی مڈل مین کے اپنی محنت سے اگائے گئے بیج براہِ راست فروخت یا تبادلہ کر سکیں، اپنے تجربات کسان ڈائری میں بانٹیں، اور جدید ٹیکنالوجی کے ذریعے قریبی کاشتکاروں سے جڑے رہیں۔',
          ]
        : [
            'Desi Beej Exchange is a trusted agricultural marketplace connecting farmers, growers, and heirloom seed suppliers across Pakistan.',
            'Rooted in traditional open-pollinated farming and driven by modern marketplace innovation, we enable transparent seed swaps, direct wholesale & retail sales, voice/text chats, and community Kisan Diaries with zero middlemen.',
          ],
    },
    contact: {
      title: isUrdu ? 'رابطہ اور کسان مدد' : 'Contact & Farmer Support',
      paragraphs: isUrdu
        ? [
            'دیسی بیج ایکسچینج پاکستان بھر کے کسانوں اور باغبانوں کے درمیان براہِ راست رابطے کا آزاد پلیٹ فارم ہے۔',
            'اگر آپ کو اپنا بیج شامل کرنے یا ضلع کے بیج محافظوں سے جڑنے میں مدد درکار ہو تو ہماری ٹیم سے ای میل support@desibeej.pk یا واٹس ایپ ہیلپ ڈیسک +92 300 000 1947 پر رابطہ کریں۔',
          ]
        : [
            'Desi Beej Exchange is a community-driven platform connecting Pakistani farmers and home gardeners directly.',
            'For assistance listing heirloom seeds or connecting with regional seed savers, reach us at support@desibeej.pk or our farmer support desk at +92 300 000 1947.',
          ],
    },
    purity: {
      title: isUrdu ? 'خالص دیسی بیج کے اصول' : 'Pure Desi Seed Guidelines',
      paragraphs: isUrdu
        ? [
            '1. صرف ایسے بیج درج کریں جو قدرتی طور پر اگائے گئے ہوں اور اگلی فصل میں دوبارہ اگنے کی صلاحیت رکھتے ہوں (Open-Pollinated / Heirloom)۔',
            '2. ہائبرڈ (F1)، جینیاتی طور پر تبدیل شدہ (GMO) یا زہریلے کیمیکل سے لپٹے ہوئے کمرشل پیکٹ بیجوں کی تشہیر سختی سے ممنوع ہے۔',
            '3. بیج خشک، صاف اور کیڑوں سے محفوظ ہونا چاہیے۔ تبادلے یا فروخت سے پہلے کسان باہمی رضامندی سے مقدار اور ترسیل طے کریں۔',
          ]
        : [
            '1. List only open-pollinated heirloom seeds capable of reproducing true-to-type in future seasons.',
            '2. F1 hybrids, genetically modified (GMO) varieties, and chemically treated commercial packet seeds are strictly prohibited.',
            '3. Ensure seeds are cleanly dried, sorted, and free from pests before swapping or shipping.',
          ],
    },
    privacy: {
      title: isUrdu ? 'رازداری کی پالیسی' : 'Privacy Policy',
      paragraphs: isUrdu
        ? [
            'آپ کی جانب سے فراہم کردہ نام، شہر اور واٹس ایپ نمبر صرف دیسی بیجوں کے تبادلے اور خرید و فروخت کے رابطے کے لیے دکھائے جاتے ہیں۔ آپ نمبر اور درست GPS مقام مخفی رکھنے کی سیٹنگ بھی استعمال کر سکتے ہیں۔',
            'دیسی بیج ایکسچینج آپ کی معلومات کسی تیسرے فریق یا اشتہاری کمپنی کو فروخت نہیں کرتا۔',
          ]
        : [
            'Your name, city, and WhatsApp contact details are used solely so fellow farmers and gardeners can connect with you regarding seed listings. You can hide your phone number and exact GPS anytime.',
            'Desi Beej Exchange never sells or shares personal information with third-party marketers or data brokers.',
          ],
    },
    terms: {
      title: isUrdu ? 'شرائط و ضوابط' : 'Terms of Service',
      paragraphs: isUrdu
        ? [
            'دیسی بیج ایکسچینج صرف کسانوں اور باغبانوں کو ملانے کا ذریعہ ہے؛ تمام تبادلے اور لین دین فریقین کے باہمی اعتماد پر براہِ راست ہوتے ہیں۔',
            'بیج شامل کرنے والے تمام صارفین اس بات کے پابند ہیں کہ وہ درست معلومات اور صرف خالص غیر ترمیم شدہ دیسی بیج ہی پیش کریں۔',
          ]
        : [
            'Desi Beej Exchange serves strictly as a trusted agricultural marketplace connecting farmers and gardeners directly. All seed exchanges and sales occur directly between participants.',
            'By publishing a listing, contributors agree to provide accurate details and offer only authentic, non-GMO heirloom seeds.',
          ],
    },
  };

  const current = contentMap[topic];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#08170D]/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="info-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-[#13311D]/95 backdrop-blur-xl border border-[#E5C65A]/30 shadow-2xl overflow-hidden text-[#F8F7EA]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 bg-[#1E462A] border-b border-[#E5C65A]/20">
          <div className="flex items-center gap-2.5">
            <Sprout className="w-5 h-5 text-[#FFF0A3] shrink-0" aria-hidden="true" />
            <h2 id="info-modal-title" className="text-lg font-bold text-[#FFF0A3]">
              {current.title}
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

        <div className="p-5 sm:p-6 space-y-3.5 text-sm sm:text-base text-[#D7E2CE] leading-relaxed">
          {current.paragraphs.map((p, idx) => (
            <p key={idx}>{p}</p>
          ))}
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] px-5 py-2 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-sm font-bold transition-colors cursor-pointer"
            >
              {isUrdu ? 'سمجھ گیا' : 'Got it'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

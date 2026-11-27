import { FormEvent, useMemo, useState } from 'react';
import {
  BadgeCheck,
  CheckCircle2,
  Home,
  Sprout,
  Star,
  User,
} from 'lucide-react';
import { UI_COPY } from '../data/seeds';
import { FarmerProfile, Language, SeedItem, SeedReview } from '../types';

interface RatingsReviewsViewProps {
  lang: Language;
  seeds: SeedItem[];
  profiles: FarmerProfile[];
  reviewsBySeed: Record<string, SeedReview[]>;
  onAddReview: (
    seedId: string,
    review: { reviewerName: string; rating: number; comment: string }
  ) => void;
  onBackHome: () => void;
  onSelectSeed: (seed: SeedItem) => void;
  onSelectProfile: (profileId: string) => void;
}

export function RatingsReviewsView({
  lang,
  seeds,
  profiles,
  reviewsBySeed,
  onAddReview,
  onBackHome,
  onSelectSeed,
  onSelectProfile,
}: RatingsReviewsViewProps) {
  const isUrdu = lang === 'ur';
  const t = UI_COPY[lang];

  const [selectedSeedId, setSelectedSeedId] = useState<string>(
    () => seeds[0]?.id || ''
  );
  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [reviewerName, setReviewerName] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewSavedNotice, setReviewSavedNotice] = useState(false);

  const allReviews = useMemo(() => {
    const list: Array<{ review: SeedReview; seed: SeedItem }> = [];
    for (const seed of seeds) {
      const revs = reviewsBySeed[seed.id] || [];
      for (const r of revs) {
        list.push({ review: r, seed });
      }
    }
    return list.sort((a, b) => b.review.createdAt - a.review.createdAt);
  }, [seeds, reviewsBySeed]);

  const trustedFarmers = useMemo(() => {
    return profiles
      .map((profile) => {
        const farmerSeeds = seeds.filter(
          (s) => s.ownerId === profile.id || s.ownerUr === profile.nameUr
        );
        let sum = 0;
        let count = 0;
        for (const s of farmerSeeds) {
          const revs = reviewsBySeed[s.id] || [];
          for (const r of revs) {
            sum += r.rating;
            count += 1;
          }
        }
        const avg = count > 0 ? sum / count : null;
        return {
          profile,
          avg,
          count,
          isTrusted: avg !== null && avg >= 4.5,
        };
      })
      .filter((item) => item.avg !== null)
      .sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0));
  }, [profiles, seeds, reviewsBySeed]);

  const globalAvg =
    allReviews.length > 0
      ? allReviews.reduce((acc, i) => acc + i.review.rating, 0) /
        allReviews.length
      : 5;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedSeedId) return;
    if (!reviewComment.trim()) {
      setReviewError(
        isUrdu
          ? 'براہِ کرم بیج کی خالصیت اور اُگاؤ پر مختصر رائے لکھیں۔'
          : 'Please write a short review about seed purity and germination.'
      );
      return;
    }

    onAddReview(selectedSeedId, {
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
    window.setTimeout(() => setReviewSavedNotice(false), 4000);
  };

  return (
    <div className="bg-[#102B19] text-[#F8F7EA] min-h-[calc(100vh-4rem)]">
      {/* Header Banner */}
      <section className="border-b border-[#44633B]/60 bg-gradient-to-b from-[#1A3B24] to-[#102B19]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-4">
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
                <li className="text-[#FFF0A3] font-semibold">{t.navRatings}</li>
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

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-[#E5C65A] mb-1">
                <Star className="w-4 h-4 fill-[#E5C65A] text-[#E5C65A]" />
                <span>
                  {isUrdu
                    ? 'کسانوں کا اعتماد اور بیجوں کا معیار'
                    : 'Community Trust & Seed Quality'}
                </span>
              </div>
              <h1
                className={`font-bold text-[#FFF0A3] ${
                  isUrdu
                    ? 'font-urdu-display text-2xl sm:text-3xl lg:text-4xl leading-[2.05]'
                    : 'font-display-heading text-3xl sm:text-4xl font-bold tracking-tight'
                }`}
              >
                {t.navRatings}
              </h1>
              <p className="text-sm sm:text-base text-[#D7E2CE] mt-1">
                {isUrdu
                  ? 'قابلِ اعتماد کسانوں کی ریٹنگز دیکھیں اور دیسی بیجوں کے اُگاؤ و خالصیت پر اپنی رائے درج کریں۔'
                  : 'Inspect verified farmer star ratings and submit reviews on heirloom seed purity and germination.'}
              </p>
            </div>

            {/* Summary KPIs */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="agri-glass-elevated px-4 py-2.5 rounded-xl text-center">
                <div className="text-xl font-bold text-[#FFF0A3] tabular-nums">
                  ⭐ {globalAvg.toFixed(1)}
                </div>
                <div className="text-[11px] font-semibold text-[#C7D3BD]">
                  {isUrdu ? 'اوسط ریٹنگ' : 'Avg Rating'}
                </div>
              </div>
              <div className="agri-glass-elevated px-4 py-2.5 rounded-xl text-center">
                <div className="text-xl font-bold text-[#E5C65A] tabular-nums">
                  {trustedFarmers.filter((f) => f.isTrusted).length}
                </div>
                <div className="text-[11px] font-semibold text-[#C7D3BD]">
                  {t.trustedFarmerBadge}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Top Rated / Trusted Farmers Row */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-[#FFF0A3]">
            {isUrdu
              ? 'اعلیٰ ریٹنگ والے کسان'
              : 'Top-Rated Seed Keepers'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {trustedFarmers.map(({ profile, avg, count, isTrusted }) => (
              <button
                key={profile.id}
                type="button"
                onClick={() => onSelectProfile(profile.id)}
                className="agri-glass rounded-2xl hover:border-[#E5C65A]/60 p-4 text-start transition-all cursor-pointer flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-[#FFF0A3]/15 border border-[#E5C65A]/30 text-[#FFF0A3] flex items-center justify-center shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm sm:text-base text-[#F8F7EA] truncate">
                      {isUrdu ? profile.nameUr : profile.nameEn}
                    </div>
                    <div className="text-xs text-[#C7D3BD] truncate">
                      {isUrdu ? profile.cityUr : profile.cityEn}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#263B20] border border-[#E5C65A]/45 text-xs font-bold text-[#FFF0A3] tabular-nums">
                    <Star className="w-3.5 h-3.5 text-[#E5C65A] fill-[#E5C65A]" />
                    {avg?.toFixed(1)} ({count})
                  </span>
                  {isTrusted && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#E5C65A]">
                      <BadgeCheck className="w-3.5 h-3.5 text-[#E5C65A]" />
                      {t.trustedFarmerBadge}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Form + Reviews List */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Submit Review Form */}
          <section className="lg:col-span-5 agri-glass-elevated rounded-2xl p-5 sm:p-6 space-y-4">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[#FFF0A3]">
                {t.reviewSectionTitle}
              </h2>
              <p className="text-xs sm:text-sm text-[#D7E2CE] mt-1">
                {isUrdu
                  ? 'بیج منتخب کر کے ۱ سے ۵ ستاروں کی ریٹنگ اور تجربہ درج کریں۔'
                  : 'Select a seed to submit a 1–5 star purity and germination review.'}
              </p>
            </div>

            {reviewSavedNotice && (
              <div
                role="status"
                className="p-3 rounded-xl bg-[#263B20] border border-[#E5C65A]/45 flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#FFF0A3]"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#E5C65A]" />
                <span>
                  {isUrdu
                    ? 'آپ کی ریٹنگ اور رائے محفوظ کر لی گئی ہے۔'
                    : 'Your review has been saved.'}
                </span>
              </div>
            )}

            {reviewError && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-400/40 text-xs sm:text-sm text-red-200">
                {reviewError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="rating-seed-select"
                  className="block text-sm font-semibold text-[#FFF0A3] mb-1.5"
                >
                  {isUrdu ? 'بیج منتخب کریں' : 'Select Seed'}
                </label>
                <select
                  id="rating-seed-select"
                  value={selectedSeedId}
                  onChange={(e) => setSelectedSeedId(e.target.value)}
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm text-[#F8F7EA] focus:outline-none focus:border-[#E5C65A]"
                >
                  {seeds.map((s) => (
                    <option key={s.id} value={s.id}>
                      {isUrdu ? s.nameUr : s.nameEn} —{' '}
                      {isUrdu ? s.ownerUr : s.ownerEn}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="block text-sm font-semibold text-[#FFF0A3] mb-1.5">
                  {isUrdu ? 'ستارے منتخب کریں:' : 'Star Rating:'}
                </span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const filled = star <= (hoverRating || selectedRating);
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setSelectedRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 rounded-lg hover:bg-[#263B20] cursor-pointer"
                      >
                        <Star
                          className={`w-7 h-7 ${
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
                  htmlFor="hub-reviewer-name"
                  className="block text-sm font-semibold text-[#FFF0A3] mb-1.5"
                >
                  {isUrdu ? 'آپ کا نام (اختیاری)' : 'Your Name (Optional)'}
                </label>
                <input
                  id="hub-reviewer-name"
                  type="text"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  placeholder={isUrdu ? 'مثلاً احمد رضا' : 'e.g., Ahmad Raza'}
                  className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm text-[#F8F7EA] placeholder:text-[#8DA182] focus:outline-none focus:border-[#E5C65A]"
                />
              </div>

              <div>
                <label
                  htmlFor="hub-review-comment"
                  className="block text-sm font-semibold text-[#FFF0A3] mb-1.5"
                >
                  {isUrdu
                    ? 'رائے (اُگاؤ اور خالصیت) *'
                    : 'Review (Purity & Germination) *'}
                </label>
                <textarea
                  id="hub-review-comment"
                  rows={3}
                  dir="auto"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder={
                    isUrdu
                      ? 'بیج کی خالصیت اور اُگاؤ کی شرح لکھیں...'
                      : 'Share your germination and seed quality feedback...'
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-[#0D2314] border border-[#44633B] text-sm text-[#F8F7EA] placeholder:text-[#8DA182] focus:outline-none focus:border-[#E5C65A]"
                />
              </div>

              <button
                type="submit"
                className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#E5C65A] hover:bg-[#FFF0A3] text-[#102B19] text-sm sm:text-base font-bold transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{isUrdu ? 'رائے جمع کروائیں' : 'Submit Review'}</span>
              </button>
            </form>
          </section>

          {/* All Reviews Feed */}
          <section className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-bold text-[#FFF0A3]">
                {isUrdu ? 'تمام کسان آراء' : 'All Farmer Reviews'}
              </h2>
              <span className="text-sm font-semibold text-[#C7D3BD] tabular-nums">
                {allReviews.length} {isUrdu ? 'آراء' : 'reviews'}
              </span>
            </div>

            <div className="space-y-3">
              {allReviews.map(({ review, seed }) => (
                <article
                  key={review.id}
                  className="agri-glass rounded-2xl p-4 sm:p-5 space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm sm:text-base text-[#F8F7EA]">
                        {review.reviewerName}
                      </span>
                      <span className="text-xs text-[#8DA182]">·</span>
                      <button
                        type="button"
                        onClick={() => onSelectSeed(seed)}
                        className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-[#E5C65A] hover:text-[#FFF0A3] hover:underline cursor-pointer"
                      >
                        <Sprout className="w-3.5 h-3.5" />
                        <span>{isUrdu ? seed.nameUr : seed.nameEn}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${
                              s <= review.rating
                                ? 'text-[#E5C65A] fill-[#E5C65A]'
                                : 'text-[#44633B]'
                            }`}
                          />
                        ))}
                      </span>
                      <span className="text-xs text-[#C7D3BD]">
                        {isUrdu ? review.dateLabelUr : review.dateLabelEn}
                      </span>
                    </div>
                  </div>

                  <p
                    dir="auto"
                    className="text-sm text-[#D7E2CE] leading-relaxed"
                  >
                    {review.comment}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

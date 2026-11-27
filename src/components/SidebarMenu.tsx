import { useEffect } from 'react';
import {
  Apple,
  BookOpen,
  Flower2,
  HelpCircle,
  Home,
  LayoutGrid,
  Leaf,
  MapPin,
  MessageCircle,
  Mic,
  PanelLeftClose,
  Plus,
  ShieldCheck,
  Sprout,
  Star,
  Store,
  TrendingUp,
  User,
  UserCheck,
  Users,
  Wheat,
  X,
} from 'lucide-react';
import { CATEGORIES, UI_COPY } from '../data/seeds';
import {
  AppTab,
  CategoryId,
  CommissionShopSection,
  InfoModalTopic,
  Language,
  ListingType,
} from '../types';

interface SidebarMenuProps {
  lang: Language;
  activeTab: AppTab;
  commissionSection?: CommissionShopSection;
  selectedCategory: CategoryId;
  selectedType: 'all' | ListingType;
  categoryCounts: Record<CategoryId, number>;
  mobileOpen: boolean;
  desktopOpen: boolean;
  onCloseMobile: () => void;
  onToggleDesktop: () => void;
  onSelectHome: () => void;
  onSelectMarketplace: () => void;
  onSelectChatHub: () => void;
  onSelectRatings: () => void;
  onSelectDiary: () => void;
  onSelectCommissionShop: () => void;
  onSelectMandiRates?: () => void;
  onSelectShopkeeperDashboard?: () => void;
  onSelectAdminShops?: () => void;
  onSelectFarmers: () => void;
  onSelectNearby: () => void;
  onSelectMyProfile: () => void;
  onSelectCategory: (cat: CategoryId) => void;
  onSelectType: (type: 'all' | ListingType) => void;
  onOpenAddSeed: () => void;
  onOpenHowItWorks: () => void;
  onOpenInfo: (topic: Exclude<InfoModalTopic, null>) => void;
}

function getCategoryIcon(id: CategoryId) {
  switch (id) {
    case 'all':
      return LayoutGrid;
    case 'vegetables':
      return Sprout;
    case 'fruits':
      return Apple;
    case 'grains':
      return Wheat;
    case 'herbs':
      return Flower2;
    case 'fodder':
      return Leaf;
  }
}

export function SidebarMenu({
  lang,
  activeTab,
  commissionSection = 'shops',
  selectedCategory,
  selectedType,
  categoryCounts,
  mobileOpen,
  desktopOpen,
  onCloseMobile,
  onToggleDesktop,
  onSelectHome,
  onSelectMarketplace,
  onSelectChatHub,
  onSelectRatings,
  onSelectDiary,
  onSelectCommissionShop,
  onSelectMandiRates,
  onSelectShopkeeperDashboard,
  onSelectAdminShops,
  onSelectFarmers,
  onSelectNearby,
  onSelectMyProfile,
  onSelectCategory,
  onSelectType,
  onOpenAddSeed,
  onOpenHowItWorks,
  onOpenInfo,
}: SidebarMenuProps) {
  const isUrdu = lang === 'ur';
  const t = UI_COPY[lang];

  useEffect(() => {
    if (!mobileOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseMobile();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [mobileOpen, onCloseMobile]);

  const navItems: Array<{
    key: string;
    label: string;
    Icon: typeof Home;
    isActive: boolean;
    onClick: () => void;
  }> = [
    {
      key: 'home',
      label: t.navHome,
      Icon: Home,
      isActive: activeTab === 'home',
      onClick: onSelectHome,
    },
    {
      key: 'marketplace',
      label: t.navMarketplace,
      Icon: Store,
      isActive: activeTab === 'marketplace',
      onClick: onSelectMarketplace,
    },
    {
      key: 'chat-hub',
      label: t.navChatHub,
      Icon: Mic,
      isActive: activeTab === 'chat-hub',
      onClick: onSelectChatHub,
    },
    {
      key: 'ratings',
      label: t.navRatings,
      Icon: Star,
      isActive: activeTab === 'ratings',
      onClick: onSelectRatings,
    },
    {
      key: 'diary',
      label: t.navKisanDiary,
      Icon: BookOpen,
      isActive: activeTab === 'diary',
      onClick: onSelectDiary,
    },
    {
      key: 'commission-shop',
      label: t.navCommissionShop,
      Icon: Store,
      isActive: activeTab === 'commission-shop' && commissionSection === 'shops',
      onClick: onSelectCommissionShop,
    },
    ...(onSelectMandiRates
      ? [
          {
            key: 'mandi-rates',
            label: isUrdu ? 'منڈی ریٹس' : 'Mandi Rates',
            Icon: TrendingUp,
            isActive:
              activeTab === 'commission-shop' &&
              commissionSection === 'mandi-rates',
            onClick: onSelectMandiRates,
          },
        ]
      : []),
    ...(onSelectShopkeeperDashboard
      ? [
          {
            key: 'shopkeeper-dashboard',
            label: isUrdu ? 'دکاندار کرایہ ڈیش بورڈ' : 'Shop Rent Dashboard',
            Icon: UserCheck,
            isActive:
              activeTab === 'commission-shop' &&
              commissionSection === 'shopkeeper-dashboard',
            onClick: onSelectShopkeeperDashboard,
          },
        ]
      : []),
    ...(onSelectAdminShops
      ? [
          {
            key: 'admin-shops',
            label: isUrdu ? 'ایڈمن شاپ پینل' : 'Admin Shop Control',
            Icon: ShieldCheck,
            isActive:
              activeTab === 'commission-shop' &&
              commissionSection === 'admin-shops',
            onClick: onSelectAdminShops,
          },
        ]
      : []),
    {
      key: 'farmers',
      label: t.navFarmers,
      Icon: Users,
      isActive: activeTab === 'farmers',
      onClick: onSelectFarmers,
    },
    {
      key: 'nearby',
      label: t.navNearby,
      Icon: MapPin,
      isActive: activeTab === 'nearby',
      onClick: onSelectNearby,
    },
    {
      key: 'profile',
      label: t.navMyProfile,
      Icon: User,
      isActive: activeTab === 'profile',
      onClick: onSelectMyProfile,
    },
  ];

  const menuContent = (isMobileDrawer: boolean) => (
    <div className="flex flex-col h-full bg-[#13311D] text-[#F8F7EA]">
      {/* Drawer Header (Mobile) or Desktop Collapse Row */}
      <div className="px-4 py-3.5 border-b border-[#E5C65A]/20 flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-[#FFF0A3]">
          {isUrdu ? 'مینو اور فلٹرز' : 'Menu & Filters'}
        </span>
        {isMobileDrawer ? (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label={isUrdu ? 'مینو بند کریں' : 'Close menu'}
            className="w-9 h-9 rounded-lg border border-[#44633B] bg-[#183822] hover:bg-[#263B20] flex items-center justify-center text-[#FFF0A3] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onToggleDesktop}
            title={isUrdu ? 'سائیڈبار بند کریں' : 'Collapse sidebar'}
            aria-label={isUrdu ? 'سائیڈبار بند کریں' : 'Collapse sidebar'}
            className="w-8 h-8 rounded-lg hover:bg-[#263B20] flex items-center justify-center text-[#C7D3BD] hover:text-[#FFF0A3] cursor-pointer"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3.5 space-y-6">
        {/* Primary Navigation */}
        <div className="space-y-1.5">
          <div className="px-2.5 text-xs font-bold text-[#E5C65A]/80 uppercase tracking-wider">
            {isUrdu ? 'صفحات' : 'Navigation'}
          </div>

          {navItems.map((item) => {
            const Icon = item.Icon;
            const active = item.isActive;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  item.onClick();
                  if (isMobileDrawer) onCloseMobile();
                }}
                className={`w-full min-h-[42px] px-3 py-2 rounded-xl flex items-center gap-2.5 text-sm font-semibold transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#E5C65A] text-[#102B19] shadow-sm'
                    : 'text-[#E6ECE0] hover:bg-[#263B20]/80 hover:text-[#FFF0A3]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => {
              onOpenAddSeed();
              if (isMobileDrawer) onCloseMobile();
            }}
            className={`w-full min-h-[42px] px-3 py-2 rounded-xl flex items-center gap-2.5 text-sm font-bold transition-colors cursor-pointer ${
              activeTab === 'add-seed'
                ? 'bg-[#FFF0A3] text-[#102B19]'
                : 'bg-[#263B20]/90 border border-[#E5C65A]/45 text-[#FFF0A3] hover:bg-[#2E4826]'
            }`}
          >
            <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {t.addSeedBtn.replace(/^\+\s*/, '')}
            </span>
          </button>
        </div>

        {/* Categories Filter */}
        <div className="space-y-1.5 pt-2 border-t border-[#E5C65A]/15">
          <div className="px-2.5 text-xs font-bold text-[#E5C65A]/80 uppercase tracking-wider">
            {t.categoriesTitle}
          </div>

          <div className="space-y-1">
            {CATEGORIES.map((cat) => {
              const Icon = getCategoryIcon(cat.id);
              const isActive =
                activeTab === 'marketplace' && selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    onSelectCategory(cat.id);
                    if (isMobileDrawer) onCloseMobile();
                  }}
                  className={`w-full min-h-[40px] px-3 py-2 rounded-xl flex items-center justify-between gap-2 text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#263B20] border border-[#E5C65A]/50 text-[#FFF0A3] font-bold'
                      : 'text-[#D7E2CE] hover:bg-[#263B20]/60'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-[#FFF0A3]' : 'text-[#E5C65A]'
                      }`}
                      aria-hidden="true"
                    />
                    <span className="truncate">
                      {isUrdu ? cat.ur : cat.en}
                    </span>
                  </span>
                  <span className="text-xs font-semibold tabular-nums text-[#E5C65A] shrink-0">
                    {categoryCounts[cat.id]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Listing Type Quick Filter */}
        <div className="space-y-1.5 pt-2 border-t border-[#E5C65A]/15">
          <div className="px-2.5 text-xs font-bold text-[#E5C65A]/80 uppercase tracking-wider">
            {isUrdu ? 'دستیابی کی قسم' : 'Listing Type'}
          </div>
          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#0D2314] border border-[#44633B]/60">
            {(
              [
                { id: 'all', label: t.filterAllTypes },
                { id: 'exchange', label: isUrdu ? 'تبادلہ' : 'Swap' },
                { id: 'sale', label: isUrdu ? 'فروخت' : 'Sale' },
              ] as const
            ).map((opt) => {
              const active =
                activeTab === 'marketplace' && selectedType === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onSelectType(opt.id);
                    if (isMobileDrawer) onCloseMobile();
                  }}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-[#E5C65A] text-[#102B19] shadow-sm'
                      : 'text-[#C7D3BD] hover:text-[#FFF0A3]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Help & Purity Guidelines */}
        <div className="space-y-1 pt-2 border-t border-[#E5C65A]/15">
          <div className="px-2.5 text-xs font-bold text-[#E5C65A]/80 uppercase tracking-wider">
            {isUrdu ? 'رہنمائی اور اصول' : 'Guides & Support'}
          </div>

          <button
            type="button"
            onClick={() => {
              onOpenHowItWorks();
              if (isMobileDrawer) onCloseMobile();
            }}
            className="w-full min-h-[38px] px-3 py-2 rounded-xl flex items-center gap-2.5 text-sm font-medium text-[#D7E2CE] hover:bg-[#263B20]/70 hover:text-[#FFF0A3] transition-colors cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-[#E5C65A] shrink-0" />
            <span className="truncate">{t.navHowItWorks}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onOpenInfo('purity');
              if (isMobileDrawer) onCloseMobile();
            }}
            className="w-full min-h-[38px] px-3 py-2 rounded-xl flex items-center gap-2.5 text-sm font-medium text-[#D7E2CE] hover:bg-[#263B20]/70 hover:text-[#FFF0A3] transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-[#FFF0A3] shrink-0" />
            <span className="truncate">{t.footerPurityLink}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onOpenInfo('contact');
              if (isMobileDrawer) onCloseMobile();
            }}
            className="w-full min-h-[38px] px-3 py-2 rounded-xl flex items-center gap-2.5 text-sm font-medium text-[#D7E2CE] hover:bg-[#263B20]/70 hover:text-[#FFF0A3] transition-colors cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 text-[#E5C65A] shrink-0" />
            <span className="truncate">{t.footerContactLink}</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Collapsible Sidebar */}
      {desktopOpen && (
        <aside
          aria-label={isUrdu ? 'سائیڈبار مینو' : 'Sidebar Navigation'}
          className="hidden lg:block lg:w-64 xl:w-72 shrink-0 border-e border-[#E5C65A]/20 bg-[#13311D]"
        >
          <div className="sticky top-16 h-[calc(100vh-4rem)]">
            {menuContent(false)}
          </div>
        </aside>
      )}

      {/* Mobile Slide-Over Drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label={isUrdu ? 'سائیڈبار مینو' : 'Sidebar Menu'}
        >
          <div
            className="fixed inset-0 bg-[#08170D]/70 backdrop-blur-[2px]"
            onClick={onCloseMobile}
          />
          <aside className="relative z-10 w-72 max-w-[85vw] h-full shadow-2xl border-e border-[#E5C65A]/25">
            {menuContent(true)}
          </aside>
        </div>
      )}
    </>
  );
}

import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowUpRight, Boxes, Search, Sparkles } from 'lucide-react';
import { useLang } from '../../lib/context';

export default function ServicesPage() {
  const { t, locale } = useLang();
  const [, navigate] = useLocation();
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/sections', { credentials: 'include' }).then(response => response.json()).then(data => setSections(data.sections || [])).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-28"><div className="king-spinner" /></div>;

  return (
    <div className="page-shell">
      <div className="page-heading">
        <div><div className="eyebrow"><span className="eyebrow-dot" />{locale === 'ar' ? 'مكتبة النمو' : 'Growth library'}</div><h1 className="page-title mt-2">{t.services}</h1><p className="page-subtitle">{locale === 'ar' ? 'اختر الفئة المناسبة، ثم حدّد الخدمة التي تحقق هدفك.' : 'Choose a category, then pick the service that moves your goal forward.'}</p></div>
        <div className="hidden items-center gap-2 rounded-xl border border-white/[.08] bg-white/[.035] px-4 py-3 text-xs text-[#a9b5d4] sm:flex"><Boxes size={16} className="text-[#ffc95c]" /><span><b className="text-white">{sections.length}</b> {locale === 'ar' ? 'أقسام متاحة' : 'categories available'}</span></div>
      </div>

      <section className="relative overflow-hidden rounded-[1.5rem] border border-[#8276ff]/20 bg-[linear-gradient(120deg,rgba(74,61,170,.42),rgba(18,27,55,.72)_50%,rgba(19,92,130,.28))] p-5 sm:p-7">
        <div className="absolute -end-12 -top-16 h-52 w-52 rounded-full bg-[#ffc95c]/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between"><div className="flex items-start gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#ffc95c]/15 text-[#ffe096] ring-1 ring-[#ffc95c]/20"><Sparkles size={22} /></span><div><h2 className="text-lg font-extrabold text-white">{locale === 'ar' ? 'خدمات منتقاة لنتائج أوضح' : 'Curated services for clearer results'}</h2><p className="mt-1 max-w-xl text-sm leading-6 text-[#b8c4e5]">{locale === 'ar' ? 'كل قسم ينظم خياراتك لتصل إلى ما تحتاجه بسرعة، مع تفاصيل سعر وحدود واضحة.' : 'Every category organizes the right options so you can decide quickly, with transparent pricing and limits.'}</p></div></div><button onClick={() => document.getElementById('king-categories')?.scrollIntoView({ behavior: 'smooth' })} className="btn-secondary shrink-0"><Search size={16} />{locale === 'ar' ? 'عرض الأقسام' : 'Explore categories'}</button></div>
      </section>

      {sections.length === 0 ? (
        <div className="empty-state"><span className="empty-icon"><Boxes size={28} /></span><p className="text-lg font-extrabold text-white">{locale === 'ar' ? 'لا توجد أقسام متاحة حالياً' : 'No categories available yet'}</p><p className="mt-2 text-sm text-[#8d98b7]">{locale === 'ar' ? 'سيقوم فريق الإدارة بإضافة الخدمات قريباً.' : 'The administration team will add services soon.'}</p></div>
      ) : (
        <section id="king-categories" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sections.map((section, index) => {
            const count = section.serviceMode === 'all' ? (locale === 'ar' ? 'جميع الخدمات' : 'All services') : `${JSON.parse(section.serviceIds || '[]').length} ${locale === 'ar' ? 'خدمة' : 'services'}`;
            return <button key={section.id} onClick={() => navigate(`/dashboard/services/section/${section.id}`)} className="group relative overflow-hidden rounded-[1.35rem] border border-white/[.075] bg-[rgba(16,20,35,.7)] p-5 text-start shadow-[0_18px_42px_rgba(0,0,0,.16)] transition-all duration-300 hover:-translate-y-1 hover:border-[#b5a5ff]/35 hover:shadow-[0_24px_50px_rgba(24,22,74,.28)]" style={{ animationDelay: `${index * 55}ms` }}>
              <div className="absolute -end-10 -top-10 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-30" style={{ background: section.color }} />
              <div className="relative flex items-start justify-between gap-4">
                {section.imageUrl ? (
                  <span className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl ring-1 ring-white/10 transition-transform duration-300 group-hover:scale-110"><img src={section.imageUrl} alt="" className="h-full w-full object-cover" /></span>
                ) : (
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl ring-1 ring-white/10 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3" style={{ backgroundColor: `${section.color}22`, boxShadow: `0 14px 28px ${section.color}18` }}>{section.icon}</span>
                )}
                <span className="rounded-full border border-white/[.08] bg-black/10 px-2.5 py-1 text-[10px] font-bold text-[#aeb8d2]">{count}</span>
              </div>
              <div className="relative mt-5"><h3 className="text-lg font-extrabold text-white transition-colors group-hover:text-[#ffe09a]">{locale === 'ar' ? section.nameAr : section.name}</h3>{(section.descriptionAr || section.description) && <p className="mt-2 min-h-10 text-sm leading-5 text-[#8f9ab8]">{locale === 'ar' ? section.descriptionAr : section.description}</p>}</div>
              <div className="relative mt-5 flex items-center justify-between border-t border-white/[.06] pt-4 text-xs font-bold"><span className="text-[#96a2c3]">{locale === 'ar' ? 'استعراض الخيارات' : 'Browse options'}</span><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[.06] text-[#ffda83] transition-all duration-200 group-hover:bg-[#ffc95c] group-hover:text-[#181326]"><ArrowUpRight size={15} /></span></div>
            </button>;
          })}
        </section>
      )}
    </div>
  );
}

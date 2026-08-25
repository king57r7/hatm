import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useLang } from '../../lib/context';

export default function ServicesPage() {
  const { t, locale } = useLang();
  const [, navigate] = useLocation();
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/sections', { credentials: 'include' }).then(r => r.json()).then(d => setSections(d.sections || [])).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>;

  if (sections.length === 0) return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">{t.services}</h1>
      <div className="card text-center py-16">
        <div className="text-6xl mb-4">🛍️</div>
        <p className="text-gray-400 text-lg">{locale === 'ar' ? 'لا توجد أقسام متاحة حالياً' : 'No sections available yet'}</p>
        <p className="text-gray-600 text-sm mt-2">{locale === 'ar' ? 'يقوم الأدمن بإضافة الخدمات قريباً' : 'Admin will add services soon'}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">{t.services}</h1>
      <p className="text-gray-500">{locale === 'ar' ? 'اختر قسماً لعرض الخدمات المتاحة' : 'Choose a section to view available services'}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map(section => (
          <button key={section.id} onClick={() => navigate(`/dashboard/services/section/${section.id}`)}
            className="card hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-200 text-start group cursor-pointer">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition-transform duration-200"
                style={{ backgroundColor: section.color + '20', border: `1px solid ${section.color}40` }}>{section.icon}</div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-bold text-lg group-hover:text-amber-400 transition-colors">{locale === 'ar' ? section.nameAr : section.name}</h3>
                {(section.descriptionAr || section.description) && (
                  <p className="text-gray-500 text-sm mt-1 line-clamp-2">{locale === 'ar' ? section.descriptionAr : section.description}</p>
                )}
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-gray-600">
                {section.serviceMode === 'all' ? (locale === 'ar' ? 'جميع الخدمات' : 'All services') : `${JSON.parse(section.serviceIds || '[]').length} ${locale === 'ar' ? 'خدمة' : 'services'}`}
              </span>
              <span className="text-amber-500 text-sm font-medium group-hover:translate-x-1 transition-transform duration-200">{locale === 'ar' ? 'عرض ←' : '→ View'}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

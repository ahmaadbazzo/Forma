/* Sample content — used for template previews, landing page and "load example".
 * Never written to the user's data unless they explicitly ask. */
(function () {
  'use strict';
  const CVM = (window.CVM = window.CVM || {});
  const S = () => CVM.Schema;

  const DATA = {
    en: {
      personal: { name: 'Alex Morgan', title: 'Senior Product Designer', email: 'alex.morgan@email.com', phone: '+1 555 014 2290', location: 'Berlin, Germany', website: 'alexmorgan.design', linkedin: 'linkedin.com/in/alexmorgan', github: 'github.com/alexmorgan' },
      summary: 'Product designer with 8 years of experience shipping web and mobile products used by over 2 million people. Focused on research-led design systems, accessibility and measurable business outcomes.',
      experience: [
        { position: 'Senior Product Designer', company: 'Northwind Labs', location: 'Berlin', start: '2021-03', end: '', current: true, description: '- Led redesign of the onboarding flow, lifting activation by 24%\n- Built a design system of 60+ components adopted by 5 product teams\n- Mentored 4 designers and ran weekly critique sessions' },
        { position: 'Product Designer', company: 'Brightside Studio', location: 'London', start: '2018-06', end: '2021-02', current: false, description: '- Designed a booking platform that processed 120k bookings in year one\n- Reduced support tickets by 31% through clearer error states' }
      ],
      education: [{ institution: 'University of the Arts', degree: 'BA Interaction Design', location: 'London', start: '2014-09', end: '2018-06', description: 'Graduated with First-Class Honours.' }],
      projects: [
        { name: 'Open Accessibility Kit', link: 'github.com/alexmorgan/a11y-kit', technologies: 'Figma, React, Storybook', description: 'Open-source toolkit of accessible UI patterns, used by 1,800+ designers.' },
        { name: 'Pocket Budget', link: '', technologies: 'Swift, SwiftUI', description: 'Personal finance app with 40k downloads and a 4.8 rating.' }
      ],
      skills: [['UX Research', 'expert'], ['Design Systems', 'expert'], ['Figma', 'expert'], ['Prototyping', 'advanced'], ['Accessibility', 'advanced'], ['HTML & CSS', 'intermediate'], ['User Testing', 'advanced'], ['Data Analysis', 'intermediate']],
      languages: [['English', 'native'], ['German', 'advanced'], ['Spanish', 'basic']],
      certificates: [{ name: 'Certified Usability Analyst', organization: 'HFI', date: '2020-05' }, { name: 'Google UX Design', organization: 'Coursera', date: '2019-02' }],
      courses: [{ name: 'Advanced Prototyping', organization: 'Interaction Design Foundation', date: '2022-01' }],
      achievements: [{ title: 'Red Dot Design Award', date: '2022-10', description: 'For the Northwind mobile redesign.' }],
      volunteer: [{ organization: 'Code for Berlin', position: 'Design Volunteer', start: '2020-01', end: '2022-12', description: '- Designed civic-tech tools for local communities' }],
      interests: ['Photography', 'Cycling', 'Typography'],
      references: [{ name: 'Jordan Lee', position: 'Head of Design', organization: 'Northwind Labs', email: 'jordan@northwind.example', phone: '' }],
      custom: [{ title: 'Talk: Designing for everyone', subtitle: 'UX Berlin Conference', date: '2023', description: 'Keynote on inclusive design for 600 attendees.' }]
    },
    ar: {
      personal: { name: 'ليان أحمد', title: 'مصممة منتجات أولى', email: 'layan.ahmad@email.com', phone: '+971 50 123 4567', location: 'دبي، الإمارات', website: 'layan.design', linkedin: 'linkedin.com/in/layanahmad', github: 'github.com/layanahmad' },
      summary: 'مصممة منتجات بخبرة ثماني سنوات في إطلاق تطبيقات ومواقع يستخدمها أكثر من مليوني مستخدم. أركّز على أنظمة التصميم وسهولة الاستخدام والنتائج القابلة للقياس.',
      experience: [
        { position: 'مصممة منتجات أولى', company: 'شركة نورث لابز', location: 'دبي', start: '2021-03', end: '', current: true, description: '- قدت إعادة تصميم تجربة التسجيل ورفعت نسبة التفعيل بنسبة 24%\n- بنيت نظام تصميم يضم أكثر من 60 مكوّناً تعتمده 5 فرق\n- أشرفت على 4 مصممين وأدرت جلسات مراجعة أسبوعية' },
        { position: 'مصممة منتجات', company: 'استوديو الأفق', location: 'عمّان', start: '2018-06', end: '2021-02', current: false, description: '- صممت منصة حجوزات عالجت 120 ألف حجز في السنة الأولى\n- خفّضت تذاكر الدعم بنسبة 31% عبر رسائل خطأ أوضح' }
      ],
      education: [{ institution: 'الجامعة الأردنية', degree: 'بكالوريوس تصميم الوسائط', location: 'عمّان', start: '2014-09', end: '2018-06', description: 'تخرجت بتقدير امتياز.' }],
      projects: [
        { name: 'حزمة إتاحة مفتوحة', link: 'github.com/layanahmad/a11y-kit', technologies: 'Figma، React', description: 'حزمة مفتوحة المصدر لأنماط واجهات سهلة الاستخدام يستخدمها أكثر من 1800 مصمم.' },
        { name: 'ميزانيتي', link: '', technologies: 'Swift', description: 'تطبيق مالي شخصي بأكثر من 40 ألف تنزيل وتقييم 4.8.' }
      ],
      skills: [['أبحاث المستخدم', 'expert'], ['أنظمة التصميم', 'expert'], ['فيجما', 'expert'], ['النماذج الأولية', 'advanced'], ['إمكانية الوصول', 'advanced'], ['HTML و CSS', 'intermediate'], ['اختبار المستخدم', 'advanced'], ['تحليل البيانات', 'intermediate']],
      languages: [['العربية', 'native'], ['الإنجليزية', 'advanced'], ['الفرنسية', 'basic']],
      certificates: [{ name: 'محلل قابلية استخدام معتمد', organization: 'HFI', date: '2020-05' }, { name: 'شهادة تصميم تجربة المستخدم', organization: 'كورسيرا', date: '2019-02' }],
      courses: [{ name: 'النماذج الأولية المتقدمة', organization: 'مؤسسة تصميم التفاعل', date: '2022-01' }],
      achievements: [{ title: 'جائزة التصميم الذهبية', date: '2022-10', description: 'عن إعادة تصميم تطبيق نورث.' }],
      volunteer: [{ organization: 'مبادرة مجتمعي', position: 'مصممة متطوعة', start: '2020-01', end: '2022-12', description: '- صممت أدوات رقمية لخدمة المجتمعات المحلية' }],
      interests: ['التصوير', 'القراءة', 'الخط العربي'],
      references: [{ name: 'سامر خليل', position: 'رئيس قسم التصميم', organization: 'شركة نورث لابز', email: 'samer@northlabs.example', phone: '' }],
      custom: [{ title: 'محاضرة: تصميم للجميع', subtitle: 'مؤتمر تجربة المستخدم', date: '2023', description: 'كلمة رئيسية عن التصميم الشامل أمام 600 حاضر.' }]
    }
  };

  /** Fill an existing cv's sections/personal with sample content (clone; keeps template/style/lang/order). */
  function preview(cv, forceLang) {
    const Sc = S(), lang = forceLang || cv.lang, d = DATA[lang === 'ar' ? 'ar' : 'en'];
    const out = CVM.clone(cv);
    out.lang = lang === 'ar' ? 'ar' : 'en';
    out.personal = Object.assign(Sc.blankPersonal(), d.personal, { photo: '' });
    const have = new Set(out.sections.map(s => s.type));
    // For previews, ensure a rich set of sections exists even if the CV is empty.
    ['summary', 'experience', 'education', 'projects', 'skills', 'languages', 'certificates', 'interests'].forEach(t => { if (!have.has(t)) out.sections.push(Sc.newSection(t)); });
    out.sections.forEach(s => {
      s.visible = true;
      const def = Sc.SECTION_TYPES[s.type];
      if (def.kind === 'text') { s.text = d.summary; return; }
      const src = s.type === 'skills' || s.type === 'languages' ? d[s.type].map(([name, level]) => ({ name, level }))
        : s.type === 'interests' ? d.interests.map(name => ({ name })) : d[s.type];
      if (!src) return;
      s.items = src.map(x => Object.assign(Sc.newItem(s.type), x));
    });
    return out;
  }
  const blank = lang => preview(CVM.Schema.createCV({ lang, sections: ['summary', 'experience', 'education', 'projects', 'skills', 'languages', 'certificates', 'interests'] }), lang);

  CVM.Sample = { DATA, preview, blank };
})();
